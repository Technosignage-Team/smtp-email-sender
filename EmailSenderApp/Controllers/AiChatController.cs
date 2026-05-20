using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using EmailApi.Data;
using EmailApi.Models;
using EmailApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Controllers
{
    [ApiController]
    [Route("api/ai")]
    public class AiChatController : ControllerBase
    {
        private const string GeminiModel  = "gemini-2.0-flash";
        private const string GeminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models";
        private const string EmailApiKeyHeader  = "X-Api-Key";
        private const string GeminiKeyHeader    = "X-Gemini-Key";

        private static readonly string SystemPrompt =
            "You are a helpful email assistant. When the user asks to send an email, call the send_email function.\n" +
            "Rules:\n" +
            "- Extract recipients, subject, and body from the user's message.\n" +
            "- If any required field is missing, ask the user for it before calling the function.\n" +
            "- Write a clean, professional HTML email body by default (use <p>, <strong>, <br> etc.) unless the user asks for plain text.\n" +
            "- Never invent email addresses — only use what the user explicitly provides.\n" +
            "- If the user says 'me' or 'myself' as a recipient, ask for their actual email address.\n" +
            "- After the function result arrives, report clearly whether the email was sent or failed.";

        // Function declaration sent to Gemini on every turn-1 call.
        private static readonly string ToolJson =
            """
            [{
              "function_declarations": [{
                "name": "send_email",
                "description": "Send an email to one or more recipients via the EmailSender service. Call this whenever the user wants to send an email.",
                "parameters": {
                  "type": "OBJECT",
                  "properties": {
                    "recipients": {
                      "type": "ARRAY",
                      "items": { "type": "STRING" },
                      "description": "List of recipient email addresses."
                    },
                    "subject": {
                      "type": "STRING",
                      "description": "Plain-text email subject line."
                    },
                    "body": {
                      "type": "STRING",
                      "description": "Email body — use HTML by default."
                    },
                    "isHtml": {
                      "type": "BOOLEAN",
                      "description": "True when body is HTML (default). False for plain text."
                    }
                  },
                  "required": ["recipients", "subject", "body"]
                }
              }]
            }]
            """;

        private readonly IEmailService _emailService;
        private readonly EmailSenderDbContext _db;
        private readonly IHttpClientFactory _http;
        private readonly IConfiguration _config;

        public AiChatController(
            IEmailService emailService,
            EmailSenderDbContext db,
            IHttpClientFactory http,
            IConfiguration config)
        {
            _emailService = emailService;
            _db = db;
            _http = http;
            _config = config;
        }

        /// <summary>
        /// AI chat endpoint. Accepts a user message + conversation history, asks Gemini,
        /// and — if Gemini wants to send an email — executes it via the local email service.
        ///
        /// Auth:
        ///   - Email API key: X-Api-Key header OR emailApiKey JSON field.
        ///   - Gemini API key: appsettings.json "Gemini:ApiKey" OR X-Gemini-Key header OR geminiApiKey JSON field.
        /// </summary>
        [HttpPost("chat")]
        [Consumes("application/json")]
        [Produces("application/json")]
        public async Task<IActionResult> Chat([FromBody] AiChatRequest request)
        {
            // ── 1. Resolve & validate Email API key ──────────────────────────
            var emailApiKey = ResolveHeader(EmailApiKeyHeader) ?? request.EmailApiKey?.Trim();
            if (string.IsNullOrWhiteSpace(emailApiKey))
                return Unauthorized(new { error = "Missing email API key. Send it in the X-Api-Key header or emailApiKey JSON field." });

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.AppKey == emailApiKey);
            if (app == null)
                return Unauthorized(new { error = "Invalid email API key." });
            if (!app.IsActive)
                return StatusCode(403, new { error = "This app has been deactivated." });

            // ── 2. Resolve Gemini API key ─────────────────────────────────────
            var geminiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(geminiKey))
                geminiKey = ResolveHeader(GeminiKeyHeader) ?? request.GeminiApiKey?.Trim();
            if (string.IsNullOrWhiteSpace(geminiKey))
                return BadRequest(new { error = "Gemini API key required. Configure Gemini:ApiKey in appsettings.json or send the X-Gemini-Key header." });

            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { error = "Message is required." });

            // ── 3. Build Gemini contents array ────────────────────────────────
            var contents = new JsonArray();
            foreach (var item in request.History)
            {
                var role = item.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
                contents.Add(MakeTextTurn(role, item.Content));
            }
            contents.Add(MakeTextTurn("user", request.Message));

            // ── 4. Turn 1 — ask Gemini (with function tools) ──────────────────
            JsonObject r1;
            try { r1 = await CallGeminiAsync(geminiKey, contents, withTools: true); }
            catch (Exception ex) { return StatusCode(502, new { error = $"Gemini error: {ex.Message}" }); }

            var candidate = r1["candidates"]?[0];
            var parts = candidate?["content"]?["parts"]?.AsArray();
            if (parts == null)
                return StatusCode(502, new { error = "Unexpected response from Gemini." });

            // ── 5. Check for send_email function call ─────────────────────────
            JsonObject? fnCall = null;
            foreach (var part in parts)
            {
                if (part?["functionCall"] is JsonObject fc)
                {
                    fnCall = fc;
                    break;
                }
            }

            if (fnCall != null && fnCall["name"]?.GetValue<string>() == "send_email")
            {
                var args = fnCall["args"]?.AsObject() ?? new JsonObject();

                // Extract arguments
                var recipients = new List<string>();
                if (args["recipients"] is JsonArray ra)
                    foreach (var r in ra)
                        if (r?.GetValue<string>() is { Length: > 0 } addr) recipients.Add(addr);

                var subject = args["subject"]?.GetValue<string>() ?? string.Empty;
                var body    = args["body"]?.GetValue<string>()    ?? string.Empty;
                var isHtml  = args["isHtml"]?.GetValue<bool>() ?? true;

                // ── 6. Execute email send ─────────────────────────────────────
                bool emailOk = false;
                string? emailError = null;
                var sw = System.Diagnostics.Stopwatch.StartNew();
                try
                {
                    var smtpOverride = (app.SenderEmail != null || app.SmtpServer != null) ? new Services.ServiceSmtpConfig
                    {
                        FromEmail  = app.SenderEmail,
                        FromName   = app.SenderName,
                        Username   = app.SmtpUsername,
                        Password   = app.SmtpPassword,
                        Server     = app.SmtpServer,
                        Port       = app.SmtpPort,
                        Encryption = app.SmtpEncryption,
                    } : null;
                    await _emailService.SendEmailAsync(subject, body, recipients, Array.Empty<EmailAttachment>(), isHtml, smtpOverride);
                    emailOk = true;
                }
                catch (Exception ex) { emailError = ex.Message; }
                sw.Stop();

                // ── 7. Log the email attempt ──────────────────────────────────
                await LogAsync(app, subject, body, recipients, isHtml,
                    status: emailOk ? "Sent" : "Failed",
                    error: emailError,
                    durationMs: (int)sw.ElapsedMilliseconds);

                // Build function result for Gemini
                var fnResultJson = emailOk
                    ? $@"{{""success"":true,""message"":""Email sent successfully"",""recipientCount"":{recipients.Count}}}"
                    : $@"{{""success"":false,""error"":{JsonSerializer.Serialize(emailError)}}}";

                // ── 8. Turn 2 — give Gemini the result ───────────────────────
                // Append model turn (with function call) + function response
                contents.Add(JsonNode.Parse(candidate!["content"]!.ToJsonString())!);
                contents.Add(JsonNode.Parse($@"
                    {{
                        ""role"": ""user"",
                        ""parts"": [{{
                            ""functionResponse"": {{
                                ""name"": ""send_email"",
                                ""response"": {fnResultJson}
                            }}
                        }}]
                    }}")!);

                JsonObject r2;
                try { r2 = await CallGeminiAsync(geminiKey, contents, withTools: false); }
                catch (Exception ex) { return StatusCode(502, new { error = $"Gemini error (turn 2): {ex.Message}" }); }

                var reply2 = ExtractText(r2);
                return Ok(new { reply = reply2, emailSent = emailOk, emailError });
            }

            // ── Normal text response (no function call) ───────────────────────
            var reply = ExtractText(r1);
            return Ok(new { reply, emailSent = false, emailError = (string?)null });
        }

        // ── Private helpers ───────────────────────────────────────────────────

        private string? ResolveHeader(string name)
        {
            if (Request.Headers.TryGetValue(name, out var v) && !string.IsNullOrWhiteSpace(v))
                return v.ToString().Trim();
            return null;
        }

        private static JsonNode MakeTextTurn(string role, string text) =>
            JsonNode.Parse($@"{{""role"":{JsonSerializer.Serialize(role)},""parts"":[{{""text"":{JsonSerializer.Serialize(text)}}}]}}")!;

        private async Task<JsonObject> CallGeminiAsync(string apiKey, JsonArray contents, bool withTools)
        {
            var url = $"{GeminiApiUrl}/{GeminiModel}:generateContent?key={Uri.EscapeDataString(apiKey)}";

            var reqBody = new JsonObject
            {
                ["system_instruction"] = JsonNode.Parse($@"{{""parts"":[{{""text"":{JsonSerializer.Serialize(SystemPrompt)}}}]}}"),
                ["contents"]           = JsonNode.Parse(contents.ToJsonString()),
                ["generation_config"]  = new JsonObject { ["temperature"] = 0.4 },
            };

            if (withTools)
                reqBody["tools"] = JsonNode.Parse(ToolJson);

            var client  = _http.CreateClient();
            var content = new StringContent(reqBody.ToJsonString(), Encoding.UTF8, "application/json");
            var resp    = await client.PostAsync(url, content);
            var json    = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
                throw new InvalidOperationException($"HTTP {(int)resp.StatusCode}: {json}");

            return JsonNode.Parse(json)!.AsObject();
        }

        private static string ExtractText(JsonObject? response)
        {
            var parts = response?["candidates"]?[0]?["content"]?["parts"]?.AsArray();
            if (parts == null) return "I didn't receive a response. Please try again.";

            var sb = new StringBuilder();
            foreach (var p in parts)
                if (p?["text"]?.GetValue<string>() is { Length: > 0 } t)
                    sb.Append(t);

            return sb.Length > 0 ? sb.ToString().Trim() : "I didn't receive a response. Please try again.";
        }

        private async Task LogAsync(AppEntity app, string subject, string body,
            List<string> recipients, bool isHtml, string status, string? error, int durationMs)
        {
            var preview = body.Length > 2000 ? body[..2000] : body;
            _db.EmailLogs.Add(new EmailLogEntity
            {
                AppId          = app.Id,
                AppName        = app.AppName,
                Subject        = subject,
                Recipients     = string.Join(",", recipients),
                RecipientCount = recipients.Count,
                AttachmentCount= 0,
                AttachmentBytes= 0,
                IsHtml         = isHtml,
                BodyPreview    = preview,
                Status         = status,
                ErrorMessage   = error,
                IpAddress      = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent      = Request.Headers.UserAgent.ToString() is { Length: > 0 } ua ? ua : null,
                SentAt         = DateTime.UtcNow,
                DurationMs     = durationMs,
            });
            app.LastUsedAt = DateTime.UtcNow;
            app.UpdatedAt  = DateTime.UtcNow;
            try { await _db.SaveChangesAsync(); } catch { /* never let logging break the response */ }
        }
    }
}
