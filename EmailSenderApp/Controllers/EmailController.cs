using EmailApi.Data;
using EmailApi.Models;
using EmailApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailController : ControllerBase
    {
        private const string ApiKeyHeader = "X-Api-Key";

        private readonly IEmailService _emailService;
        private readonly EmailSenderDbContext _db;

        public EmailController(IEmailService emailService, EmailSenderDbContext db)
        {
            _emailService = emailService;
            _db = db;
        }

        /// <summary>
        /// Unified send endpoint. Accepts multipart/form-data so the caller can include
        /// file attachments. <c>Recipients</c> may be a comma- or semicolon-separated list.
        /// If omitted, the configured fallback ToEmail is used.
        ///
        /// Authentication: send the registered app's API key in the <c>X-Api-Key</c> header
        /// (or as an <c>ApiKey</c> form field).
        /// </summary>
        [HttpPost("send")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 50 * 1024 * 1024)]
        public async Task<IActionResult> SendEmail([FromForm] SendEmailForm form)
        {
            // ---- API key resolution ----
            var apiKey = ResolveApiKey(Request, form);
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return Unauthorized(new { error = "Missing API key. Send it in the X-Api-Key header or ApiKey form field." });
            }

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.AppKey == apiKey);
            if (app == null)
            {
                return Unauthorized(new { error = "Invalid API key." });
            }
            if (!app.IsActive)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "This app has been deactivated." });
            }

            // ---- Validate payload ----
            if (string.IsNullOrWhiteSpace(form.Subject) || string.IsNullOrWhiteSpace(form.Body))
            {
                await LogAsync(app, form, recipients: new(), attachments: 0, attachmentBytes: 0,
                    status: "Rejected", error: "Subject and Body are required.", durationMs: 0);
                return BadRequest(new { error = "Subject and Body are required." });
            }

            var recipients = SplitRecipients(form.Recipients);

            var attachments = new List<EmailAttachment>();
            long attachmentBytes = 0;
            if (form.Attachments != null)
            {
                foreach (var file in form.Attachments)
                {
                    if (file.Length <= 0) continue;
                    attachments.Add(new EmailAttachment
                    {
                        FileName = file.FileName,
                        Content = file.OpenReadStream(),
                        ContentType = string.IsNullOrWhiteSpace(file.ContentType)
                            ? "application/octet-stream"
                            : file.ContentType,
                    });
                    attachmentBytes += file.Length;
                }
            }

            // ---- Send + log ----
            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                var smtpOverride = app.SenderEmail != null ? new Services.ServiceSmtpConfig
                {
                    FromEmail = app.SenderEmail,
                    FromName  = app.SenderName,
                    Username  = app.SmtpUsername,
                    Password  = app.SmtpPassword,
                } : null;
                await _emailService.SendEmailAsync(form.Subject, form.Body, recipients, attachments, form.IsHtml, smtpOverride);
                sw.Stop();

                await LogAsync(app, form, recipients, attachments.Count, attachmentBytes,
                    status: "Sent", error: null, durationMs: (int)sw.ElapsedMilliseconds);

                return Ok(new
                {
                    message = "Email sent successfully",
                    recipientCount = recipients.Count == 0 ? 1 : recipients.Count,
                    attachmentCount = attachments.Count,
                    appName = app.AppName,
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                await LogAsync(app, form, recipients, attachments.Count, attachmentBytes,
                    status: "Failed", error: ex.Message, durationMs: (int)sw.ElapsedMilliseconds);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// AI-friendly JSON endpoint. Accepts application/json so it works out-of-the-box
        /// with Gemini function calling, OpenAI Actions, Claude tools, fetch(), and axios.
        /// Supports the X-Api-Key header OR an "apiKey" field inside the JSON body.
        /// </summary>
        [HttpPost("send-ai")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> SendAiEmail([FromBody] SendAiEmailRequest request)
        {
            // ---- API key resolution (header first, body fallback) ----
            var apiKey = Request.Headers.TryGetValue(ApiKeyHeader, out var h) && !string.IsNullOrWhiteSpace(h)
                ? h.ToString().Trim()
                : request.ApiKey?.Trim();

            if (string.IsNullOrWhiteSpace(apiKey))
                return Unauthorized(new { success = false, error = "Missing API key. Send it in the X-Api-Key header or apiKey JSON field." });

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.AppKey == apiKey);
            if (app == null)
                return Unauthorized(new { success = false, error = "Invalid API key." });
            if (!app.IsActive)
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "This app has been deactivated." });

            // ---- Validate payload ----
            if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Body))
            {
                await LogRawAsync(app, request.Subject, request.Body, request.Recipients,
                    attachments: 0, attachmentBytes: 0, isHtml: request.IsHtml,
                    status: "Rejected", error: "Subject and Body are required.", durationMs: 0);
                return BadRequest(new { success = false, error = "Subject and Body are required." });
            }

            if (request.Recipients == null || request.Recipients.Count == 0)
            {
                await LogRawAsync(app, request.Subject, request.Body, new List<string>(),
                    attachments: 0, attachmentBytes: 0, isHtml: request.IsHtml,
                    status: "Rejected", error: "At least one recipient is required.", durationMs: 0);
                return BadRequest(new { success = false, error = "At least one recipient is required." });
            }

            var recipients = request.Recipients
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            // ---- Send + log ----
            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                await _emailService.SendEmailAsync(request.Subject, request.Body, recipients, new List<EmailAttachment>(), request.IsHtml);
                sw.Stop();

                await LogRawAsync(app, request.Subject, request.Body, recipients,
                    attachments: 0, attachmentBytes: 0, isHtml: request.IsHtml,
                    status: "Sent", error: null, durationMs: (int)sw.ElapsedMilliseconds);

                return Ok(new
                {
                    success = true,
                    message = "Email sent successfully",
                    recipientCount = recipients.Count,
                    appName = app.AppName,
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                await LogRawAsync(app, request.Subject, request.Body, recipients,
                    attachments: 0, attachmentBytes: 0, isHtml: request.IsHtml,
                    status: "Failed", error: ex.Message, durationMs: (int)sw.ElapsedMilliseconds);
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        /// <summary>
        /// Legacy JSON endpoint kept for backward compatibility. Also requires X-Api-Key.
        /// </summary>
        [HttpPost("send-bulk")]
        public async Task<IActionResult> SendBulkEmail([FromBody] BulkEmailRequest request)
        {
            var apiKey = Request.Headers[ApiKeyHeader].ToString();
            if (string.IsNullOrWhiteSpace(apiKey))
                return Unauthorized(new { error = "Missing API key." });

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.AppKey == apiKey);
            if (app == null) return Unauthorized(new { error = "Invalid API key." });
            if (!app.IsActive) return StatusCode(StatusCodes.Status403Forbidden, new { error = "This app has been deactivated." });

            if (string.IsNullOrEmpty(request.Subject) || string.IsNullOrEmpty(request.Body))
                return BadRequest(new { error = "Subject and Body are required." });

            if (request.Recipients == null || !request.Recipients.Any())
                return BadRequest(new { error = "At least one recipient is required." });

            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                await _emailService.SendEmailToMultipleAsync(request.Subject, request.Body, request.Recipients);
                sw.Stop();
                await LogRawAsync(app, request.Subject, request.Body, request.Recipients,
                    attachments: 0, attachmentBytes: 0, isHtml: true,
                    status: "Sent", error: null, durationMs: (int)sw.ElapsedMilliseconds);
                return Ok(new { message = "Email sent successfully", recipientCount = request.Recipients.Count });
            }
            catch (Exception ex)
            {
                sw.Stop();
                await LogRawAsync(app, request.Subject, request.Body, request.Recipients,
                    attachments: 0, attachmentBytes: 0, isHtml: true,
                    status: "Failed", error: ex.Message, durationMs: (int)sw.ElapsedMilliseconds);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ---------- helpers ----------

        private static string? ResolveApiKey(HttpRequest req, SendEmailForm form)
        {
            if (req.Headers.TryGetValue(ApiKeyHeader, out var h) && !string.IsNullOrWhiteSpace(h))
                return h.ToString().Trim();
            if (!string.IsNullOrWhiteSpace(form.ApiKey)) return form.ApiKey.Trim();
            // also accept query string for convenience
            if (req.Query.TryGetValue("apiKey", out var q) && !string.IsNullOrWhiteSpace(q))
                return q.ToString().Trim();
            return null;
        }

        private async Task LogAsync(
            AppEntity app, SendEmailForm form, List<string> recipients,
            int attachments, long attachmentBytes, string status, string? error, int durationMs)
        {
            var finalRecipients = recipients.Count > 0 ? recipients : new List<string>();
            await LogRawAsync(app, form.Subject, form.Body, finalRecipients,
                attachments, attachmentBytes, form.IsHtml, status, error, durationMs);
        }

        private async Task LogRawAsync(
            AppEntity app, string subject, string body, List<string> recipients,
            int attachments, long attachmentBytes, bool isHtml,
            string status, string? error, int durationMs)
        {
            var preview = body.Length > 2000 ? body[..2000] : body;
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var ua = Request.Headers.UserAgent.ToString();

            _db.EmailLogs.Add(new EmailLogEntity
            {
                AppId = app.Id,
                AppName = app.AppName,
                Subject = subject ?? string.Empty,
                Recipients = string.Join(",", recipients),
                RecipientCount = recipients.Count,
                AttachmentCount = attachments,
                AttachmentBytes = attachmentBytes,
                IsHtml = isHtml,
                BodyPreview = preview,
                Status = status,
                ErrorMessage = error,
                IpAddress = ip,
                UserAgent = string.IsNullOrWhiteSpace(ua) ? null : ua,
                SentAt = DateTime.UtcNow,
                DurationMs = durationMs,
            });

            // Track usage on the app
            app.LastUsedAt = DateTime.UtcNow;
            app.UpdatedAt = DateTime.UtcNow;

            try { await _db.SaveChangesAsync(); }
            catch { /* never let logging failures break the API response */ }
        }

        private static List<string> SplitRecipients(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
            return raw
                .Split(new[] { ',', ';', '\n', '\r', ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(r => r.Trim())
                .Where(r => r.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }
}
