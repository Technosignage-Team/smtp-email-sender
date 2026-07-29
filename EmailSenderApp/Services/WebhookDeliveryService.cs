using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EmailApi.Data;
using EmailApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Services
{
    public interface IWebhookDeliveryService
    {
        Task DispatchEmailReceivedAsync(long incomingEmailId, CancellationToken ct = default);
    }

    public class WebhookDeliveryService : IWebhookDeliveryService
    {
        private readonly EmailSenderDbContext _db;
        private readonly IHttpClientFactory   _http;
        private readonly ILogger<WebhookDeliveryService> _log;

        public WebhookDeliveryService(
            EmailSenderDbContext db,
            IHttpClientFactory http,
            ILogger<WebhookDeliveryService> log)
        {
            _db  = db;
            _http = http;
            _log  = log;
        }

        public async Task DispatchEmailReceivedAsync(long incomingEmailId, CancellationToken ct = default)
        {
            var email = await _db.IncomingEmails.FindAsync(new object[] { incomingEmailId }, ct);
            if (email == null) return;

            var subs = await _db.WebhookSubscriptions
                .Where(s => s.AppId == email.AppId && s.IsActive && s.Events.Contains("email.received"))
                .ToListAsync(ct);

            if (subs.Count == 0) return;

            var payload = BuildPayload(email);
            var json    = JsonSerializer.Serialize(payload, JsonOptions);
            var client  = _http.CreateClient("webhooks");
            client.Timeout = TimeSpan.FromSeconds(15);

            foreach (var sub in subs)
            {
                var sw = Stopwatch.StartNew();
                var log = new WebhookDeliveryLogEntity
                {
                    WebhookSubscriptionId = sub.Id,
                    IncomingEmailId       = incomingEmailId,
                };

                try
                {
                    var req = new HttpRequestMessage(HttpMethod.Post, sub.Url);
                    req.Content = new StringContent(json, Encoding.UTF8, "application/json");
                    req.Headers.Add("X-Webhook-Event", "email.received");
                    req.Headers.Add("X-Webhook-Signature", ComputeSignature(json, sub.Secret));
                    req.Headers.Add("User-Agent", "EmailSender-Webhook/1.0");

                    var resp = await client.SendAsync(req, ct);
                    sw.Stop();

                    log.HttpStatusCode = (int)resp.StatusCode;
                    log.DurationMs     = (int)sw.ElapsedMilliseconds;

                    if (resp.IsSuccessStatusCode)
                    {
                        log.Status = "Sent";
                        _log.LogInformation("Webhook delivered to {Url} for email {EmailId}", sub.Url, incomingEmailId);
                    }
                    else
                    {
                        log.Status       = "Failed";
                        log.ErrorMessage = $"HTTP {(int)resp.StatusCode}: {await resp.Content.ReadAsStringAsync(ct)}";
                        _log.LogWarning("Webhook failed for {Url}: {Error}", sub.Url, log.ErrorMessage);
                    }
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    log.Status       = "Failed";
                    log.ErrorMessage = ex.Message;
                    log.DurationMs   = (int)sw.ElapsedMilliseconds;
                    _log.LogWarning(ex, "Webhook exception for {Url}", sub.Url);
                }

                _db.WebhookDeliveryLogs.Add(log);
            }

            await _db.SaveChangesAsync(ct);
        }

        private static object BuildPayload(IncomingEmailEntity e) => new
        {
            @event     = "email.received",
            timestamp  = DateTime.UtcNow,
            data = new
            {
                e.Id,
                e.AppId,
                e.AppName,
                from        = e.FromAddress,
                fromName    = e.FromName,
                to          = e.ToAddress,
                e.Subject,
                bodyPreview = e.BodyPreview,
                e.HasAttachments,
                e.AttachmentCount,
                e.ReceivedAt,
            },
        };

        private static string ComputeSignature(string body, string secret)
        {
            var key  = Encoding.UTF8.GetBytes(secret);
            var data = Encoding.UTF8.GetBytes(body);
            var hash = HMACSHA256.HashData(key, data);
            return "sha256=" + Convert.ToHexString(hash).ToLowerInvariant();
        }

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        public static string GenerateWebhookSecret()
        {
            var bytes = RandomNumberGenerator.GetBytes(24);
            var b64 = Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
            return $"whsec_{b64}";
        }
    }
}
