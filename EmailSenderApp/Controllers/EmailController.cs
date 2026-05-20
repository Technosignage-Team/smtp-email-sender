using EmailApi.Data;
using EmailApi.Models;
using EmailApi.Services;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Controllers
{
    // Email sending is a public API secured by API key — allow any origin so external
    // apps (AI Studio, Claude, third-party integrations, localhost dev) can call it.
    [ApiController]
    [Route("api/[controller]")]
    [EnableCors("AllowAll")]
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

            // ---- Resolve template (optional) ----
            EmailTemplateEntity? tpl = null;
            if (form.TemplateId.HasValue)
            {
                tpl = await _db.EmailTemplates.FirstOrDefaultAsync(
                    t => t.Id == form.TemplateId.Value && t.AppId == app.Id);
                if (tpl == null)
                    return BadRequest(new { error = $"Template {form.TemplateId} not found for this service." });
            }
            else if (!string.IsNullOrWhiteSpace(form.TemplateName))
            {
                tpl = await _db.EmailTemplates.FirstOrDefaultAsync(
                    t => t.Name == form.TemplateName && t.AppId == app.Id);
                if (tpl == null)
                    return BadRequest(new { error = $"Template '{form.TemplateName}' not found for this service." });
            }

            // Merge: template provides defaults; explicit form values override them.
            var subject = (!string.IsNullOrWhiteSpace(form.Subject) ? form.Subject : null)
                          ?? tpl?.Subject;
            var body    = (!string.IsNullOrWhiteSpace(form.Body)    ? form.Body    : null)
                          ?? tpl?.Body;
            var isHtml  = tpl != null ? tpl.IsHtml : form.IsHtml;

            // ---- Validate payload ----
            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(body))
            {
                await LogRawAsync(app, subject ?? string.Empty, body ?? string.Empty, new(), 0, 0,
                    isHtml: form.IsHtml, status: "Rejected", error: "Subject and Body are required (or supply a templateId).", durationMs: 0);
                return BadRequest(new { error = "Subject and Body are required (or supply a templateId)." });
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
                // Always build per-service config; EmailService falls back to global
                // SmtpConfig for any field that is null.
                var smtpOverride = new Services.ServiceSmtpConfig
                {
                    FromEmail  = app.SenderEmail,
                    FromName   = app.SenderName,
                    Username   = app.SmtpUsername,
                    Password   = app.SmtpPassword,
                    Server     = app.SmtpServer,
                    Port       = app.SmtpPort,
                    Encryption = app.SmtpEncryption,
                };
                await _emailService.SendEmailAsync(subject!, body!, recipients, attachments, isHtml, smtpOverride);
                sw.Stop();

                await LogRawAsync(app, subject!, body!, recipients, attachments.Count, attachmentBytes,
                    isHtml: isHtml, status: "Sent", error: null, durationMs: (int)sw.ElapsedMilliseconds);

                return Ok(new
                {
                    message = "Email sent successfully",
                    recipientCount = recipients.Count == 0 ? 1 : recipients.Count,
                    attachmentCount = attachments.Count,
                    appName = app.AppName,
                    templateUsed = tpl?.Name,
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                await LogRawAsync(app, subject ?? string.Empty, body ?? string.Empty, recipients, attachments.Count, attachmentBytes,
                    isHtml: isHtml, status: "Failed", error: ex.Message, durationMs: (int)sw.ElapsedMilliseconds);
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
                return Unauthorized(new { success = false, error = "Missing API key. Send it in the X-Api-Key header or apiKey JSON field.", fieldHints = request.FieldHints });

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.AppKey == apiKey);
            if (app == null)
                return Unauthorized(new { success = false, error = "Invalid API key.", fieldHints = request.FieldHints });
            if (!app.IsActive)
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "This app has been deactivated.", fieldHints = request.FieldHints });

            // ---- Resolve template (flexible: int, "5", or "Template Name") ----
            EmailTemplateEntity? tpl = null;
            var templateRef = request.TemplateRef ?? request.TemplateName;
            if (!string.IsNullOrWhiteSpace(templateRef))
            {
                if (int.TryParse(templateRef.Trim(), out var tid))
                    tpl = await _db.EmailTemplates.FirstOrDefaultAsync(t => t.Id == tid && t.AppId == app.Id);
                else
                    tpl = await _db.EmailTemplates.FirstOrDefaultAsync(t => t.Name == templateRef.Trim() && t.AppId == app.Id);

                if (tpl == null)
                    return BadRequest(new { success = false, error = $"Template '{templateRef}' not found for this service.", fieldHints = request.FieldHints });
            }

            // Merge: template provides defaults; explicit request values override them.
            var subject = (!string.IsNullOrWhiteSpace(request.Subject) ? request.Subject : null)
                          ?? tpl?.Subject;
            var body    = (!string.IsNullOrWhiteSpace(request.Body)    ? request.Body    : null)
                          ?? tpl?.Body;
            var isHtml  = tpl != null ? tpl.IsHtml : request.IsHtml;

            // ---- Normalize recipients from all accepted aliases ----
            // Priority: recipients[] > recipient > to > email > recipientEmail
            var recipients = (request.Recipients ?? new List<string>())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .ToList();

            if (recipients.Count == 0 && !string.IsNullOrWhiteSpace(request.Recipient))
                recipients.AddRange(SplitRecipients(request.Recipient));
            if (recipients.Count == 0 && !string.IsNullOrWhiteSpace(request.To))
                recipients.AddRange(SplitRecipients(request.To));
            if (recipients.Count == 0 && !string.IsNullOrWhiteSpace(request.Email))
                recipients.AddRange(SplitRecipients(request.Email));
            if (recipients.Count == 0 && !string.IsNullOrWhiteSpace(request.RecipientEmail))
                recipients.AddRange(SplitRecipients(request.RecipientEmail));

            recipients = recipients.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            // ---- Validate payload ----
            if (recipients.Count == 0)
            {
                await LogRawAsync(app, subject ?? string.Empty, body ?? string.Empty, new List<string>(),
                    attachments: 0, attachmentBytes: 0, isHtml: isHtml,
                    status: "Rejected", error: "At least one recipient is required (use: recipients, recipient, to, or email).", durationMs: 0);
                return BadRequest(new { success = false, error = "At least one recipient is required (use: recipients, recipient, to, or email).", fieldHints = request.FieldHints });
            }

            // ---- Send + log ----
            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                // Always build per-service config; EmailService falls back to global
                // SmtpConfig for any field that is null.
                var smtpOverride = new Services.ServiceSmtpConfig
                {
                    FromEmail  = app.SenderEmail,
                    FromName   = app.SenderName,
                    Username   = app.SmtpUsername,
                    Password   = app.SmtpPassword,
                    Server     = app.SmtpServer,
                    Port       = app.SmtpPort,
                    Encryption = app.SmtpEncryption,
                };
                await _emailService.SendEmailAsync(subject ?? string.Empty, body ?? string.Empty, recipients, new List<EmailAttachment>(), isHtml, smtpOverride);
                sw.Stop();

                await LogRawAsync(app, subject ?? string.Empty, body ?? string.Empty, recipients,
                    attachments: 0, attachmentBytes: 0, isHtml: isHtml,
                    status: "Sent", error: null, durationMs: (int)sw.ElapsedMilliseconds);

                return Ok(new
                {
                    success = true,
                    message = "Email sent successfully",
                    recipientCount = recipients.Count,
                    appName = app.AppName,
                    templateUsed = tpl?.Name,
                    fieldHints = request.FieldHints,
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                await LogRawAsync(app, subject ?? string.Empty, body ?? string.Empty, recipients,
                    attachments: 0, attachmentBytes: 0, isHtml: isHtml,
                    status: "Failed", error: ex.Message, durationMs: (int)sw.ElapsedMilliseconds);
                return StatusCode(500, new { success = false, error = ex.Message, fieldHints = request.FieldHints });
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
