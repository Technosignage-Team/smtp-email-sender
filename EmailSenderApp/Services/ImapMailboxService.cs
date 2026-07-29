using EmailApi.Data;
using EmailApi.Models;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace EmailApi.Services
{
    public interface IImapMailboxService
    {
        /// <summary>Poll one app's mailbox and return IDs of newly stored incoming emails.</summary>
        Task<IReadOnlyList<long>> PollAppMailboxAsync(AppEntity app, CancellationToken ct = default);
    }

    public class ImapMailboxService : IImapMailboxService
    {
        private readonly EmailSenderDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<ImapMailboxService> _log;

        public ImapMailboxService(
            EmailSenderDbContext db,
            IConfiguration config,
            ILogger<ImapMailboxService> log)
        {
            _db = db;
            _config = config;
            _log = log;
        }

        public async Task<IReadOnlyList<long>> PollAppMailboxAsync(AppEntity app, CancellationToken ct = default)
        {
            var creds = ResolveImapCredentials(app);
            if (creds == null)
            {
                _log.LogWarning("App {AppId} ({AppName}) has IMAP enabled but no credentials.", app.Id, app.AppName);
                return Array.Empty<long>();
            }

            var newIds = new List<long>();

            using var client = new ImapClient();
            client.Timeout = 60_000;
            client.CheckCertificateRevocation = false;
            if (_config.GetValue("ImapPolling:SkipCertificateValidation", false))
                client.ServerCertificateValidationCallback = (_, _, _, _) => true;

            try
            {
                var sslOptions = creds.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.None;
                await client.ConnectAsync(creds.Server, creds.Port, sslOptions, ct);
                await client.AuthenticateAsync(creds.Username, creds.Password, ct);

                var inbox = client.Inbox;
                await inbox.OpenAsync(MailKit.FolderAccess.ReadOnly, ct);

                IList<UniqueId> uids;
                if (app.LastImapUid.HasValue && app.LastImapUid.Value > 0)
                {
                    var start = new UniqueId((uint)(app.LastImapUid.Value + 1));
                    var range = new UniqueIdRange(start, UniqueId.MaxValue);
                    uids = await inbox.SearchAsync(SearchQuery.Uids(range), ct);
                }
                else
                {
                    // First run: import recent messages (max 50), not only unread
                    var since = DateTime.UtcNow.AddDays(-14);
                    uids = await inbox.SearchAsync(SearchQuery.DeliveredAfter(since), ct);
                    if (uids.Count > 50)
                        uids = uids.OrderBy(u => u.Id).Skip(uids.Count - 50).ToList();
                }

                long maxUid = app.LastImapUid ?? 0;

                foreach (var uid in uids)
                {
                    ct.ThrowIfCancellationRequested();

                    MimeMessage message;
                    try { message = await inbox.GetMessageAsync(uid, ct); }
                    catch (Exception ex)
                    {
                        _log.LogWarning(ex, "Failed to fetch message UID {Uid} for app {AppId}", uid.Id, app.Id);
                        continue;
                    }

                    var messageId = message.MessageId?.Trim();
                    if (!string.IsNullOrEmpty(messageId) &&
                        await _db.IncomingEmails.AnyAsync(e => e.AppId == app.Id && e.MessageId == messageId, ct))
                    {
                        if (uid.Id > maxUid) maxUid = uid.Id;
                        continue;
                    }

                    var from = message.From.Mailboxes.FirstOrDefault();
                    var fromAddress = from?.Address ?? "unknown@unknown";
                    var fromName    = from?.Name;
                    var toAddress   = message.To.Mailboxes.FirstOrDefault()?.Address
                                      ?? app.SenderEmail
                                      ?? creds.Username;

                    var textBody = message.TextBody ?? string.Empty;
                    var htmlBody = message.HtmlBody;
                    var preview  = (textBody.Length > 0 ? textBody : StripHtml(htmlBody ?? "")).Trim();
                    if (preview.Length > 2000) preview = preview[..2000];

                    var entity = new IncomingEmailEntity
                    {
                        AppId           = app.Id,
                        AppName         = app.AppName,
                        MessageId       = messageId,
                        FromAddress     = fromAddress,
                        FromName        = fromName,
                        ToAddress       = toAddress,
                        Subject         = message.Subject ?? "(no subject)",
                        BodyPreview     = preview,
                        BodyText        = textBody.Length > 0 ? textBody : null,
                        BodyHtml        = htmlBody,
                        HasAttachments  = message.Attachments.Any(),
                        AttachmentCount = message.Attachments.Count(),
                        ImapUid         = uid.Id,
                        ReceivedAt      = message.Date.UtcDateTime,
                    };

                    _db.IncomingEmails.Add(entity);
                    try
                    {
                        await _db.SaveChangesAsync(ct);
                        newIds.Add(entity.Id);
                    }
                    catch (DbUpdateException ex)
                    {
                        _log.LogDebug(ex, "Duplicate message skipped for app {AppId}, MessageId={MessageId}", app.Id, messageId);
                        _db.Entry(entity).State = EntityState.Detached;
                    }

                    if (uid.Id > maxUid) maxUid = uid.Id;
                }

                app.LastImapUid    = maxUid > 0 ? maxUid : app.LastImapUid;
                app.LastImapPollAt = DateTime.UtcNow;
                app.UpdatedAt      = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);

                await client.DisconnectAsync(true, ct);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "IMAP poll failed for app {AppId} ({AppName})", app.Id, app.AppName);
                app.LastImapPollAt = DateTime.UtcNow;
                try { await _db.SaveChangesAsync(ct); } catch { /* best effort */ }
            }

            return newIds;
        }

        private static ImapCredentials? ResolveImapCredentials(AppEntity app)
        {
            var username = app.ImapUsername?.Trim()
                           ?? app.SmtpUsername?.Trim()
                           ?? app.SenderEmail?.Trim();
            var password = app.ImapPassword ?? app.SmtpPassword;

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                return null;

            var server = NormalizeMailHost(app.ImapServer);
            if (string.IsNullOrWhiteSpace(server))
            {
                // Derive IMAP host from SMTP host (Zoho: smtppro → imappro)
                var smtp = app.SmtpServer?.Trim().ToLowerInvariant();
                server = smtp switch
                {
                    "smtppro.zoho.com"  => "imappro.zoho.com",
                    "smtp.zoho.com"     => "imap.zoho.com",
                    "smtp.gmail.com"    => "imap.gmail.com",
                    "smtp.office365.com"=> "outlook.office365.com",
                    _                   => smtp?.Replace("smtp", "imap", StringComparison.OrdinalIgnoreCase),
                };
            }

            if (string.IsNullOrWhiteSpace(server))
                return null;

            return new ImapCredentials
            {
                Server   = server,
                Port     = app.ImapPort ?? 993,
                Username = username,
                Password = password,
                UseSsl   = app.ImapUseSsl,
            };
        }

        /// <summary>Strip http(s):// and paths — IMAP host must be a bare hostname.</summary>
        public static string? NormalizeMailHost(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var host = value.Trim();
            if (host.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                host = host[8..];
            else if (host.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                host = host[7..];
            var slash = host.IndexOf('/');
            if (slash >= 0) host = host[..slash];
            host = host.Trim().TrimEnd('.');
            return string.IsNullOrWhiteSpace(host) ? null : host;
        }

        private static string StripHtml(string html)
        {
            if (string.IsNullOrEmpty(html)) return string.Empty;
            return System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ")
                .Replace("&nbsp;", " ")
                .Trim();
        }

        private sealed class ImapCredentials
        {
            public string Server   { get; set; } = string.Empty;
            public int    Port     { get; set; }
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public bool   UseSsl   { get; set; }
        }
    }
}
