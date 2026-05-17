using System.Net;
using System.Net.Mail;

namespace EmailApi.Services
{
    public class EmailAttachment
    {
        public string FileName { get; set; } = string.Empty;
        public Stream Content { get; set; } = Stream.Null;
        public string ContentType { get; set; } = "application/octet-stream";
    }

    /// <summary>
    /// Per-service SMTP overrides. Any null field falls back to the global SmtpConfig.
    /// </summary>
    public class ServiceSmtpConfig
    {
        public string? FromEmail { get; set; }
        public string? FromName  { get; set; }
        public string? Username  { get; set; }
        public string? Password  { get; set; }
    }

    public interface IEmailService
    {
        Task SendEmailAsync(string subject, string body);
        Task SendEmailToMultipleAsync(string subject, string body, List<string> recipients);
        Task SendEmailAsync(
            string subject,
            string body,
            IEnumerable<string>? recipients,
            IEnumerable<EmailAttachment>? attachments,
            bool isHtml = true,
            ServiceSmtpConfig? smtpOverride = null);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public Task SendEmailAsync(string subject, string body)
            => SendEmailAsync(subject, body, recipients: null, attachments: null, isHtml: true);

        public Task SendEmailToMultipleAsync(string subject, string body, List<string> recipients)
            => SendEmailAsync(subject, body, recipients, attachments: null, isHtml: true);

        public async Task SendEmailAsync(
            string subject,
            string body,
            IEnumerable<string>? recipients,
            IEnumerable<EmailAttachment>? attachments,
            bool isHtml = true,
            ServiceSmtpConfig? smtpOverride = null)
        {
            var smtpHost  = _config["SmtpConfig:Host"];
            var smtpPort  = int.Parse(_config["SmtpConfig:Port"] ?? "587");
            var enableSsl = bool.Parse(_config["SmtpConfig:EnableSsl"] ?? "true");
            var fallbackTo = _config["SmtpConfig:ToEmail"];

            // Per-service override or global fallback
            var username  = smtpOverride?.Username  ?? _config["SmtpConfig:Username"];
            var password  = smtpOverride?.Password  ?? _config["SmtpConfig:Password"];
            var fromEmail = smtpOverride?.FromEmail  ?? _config["SmtpConfig:FromEmail"];
            var fromName  = smtpOverride?.FromName;

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl   = enableSsl
            };

            using var mailMessage = new MailMessage
            {
                From       = string.IsNullOrWhiteSpace(fromName)
                               ? new MailAddress(fromEmail!)
                               : new MailAddress(fromEmail!, fromName),
                Subject    = subject,
                Body       = body,
                IsBodyHtml = isHtml
            };

            var resolved = (recipients ?? Enumerable.Empty<string>())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (resolved.Count == 0 && !string.IsNullOrWhiteSpace(fallbackTo))
            {
                resolved.Add(fallbackTo);
            }

            if (resolved.Count == 0)
            {
                throw new InvalidOperationException("No recipient specified and no fallback ToEmail configured.");
            }

            foreach (var to in resolved)
            {
                mailMessage.To.Add(to);
            }

            if (attachments != null)
            {
                foreach (var att in attachments)
                {
                    if (att.Content == Stream.Null) continue;
                    mailMessage.Attachments.Add(new Attachment(att.Content, att.FileName, att.ContentType));
                }
            }

            await client.SendMailAsync(mailMessage);
        }
    }
}
