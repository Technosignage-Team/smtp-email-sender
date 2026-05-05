using Microsoft.AspNetCore.Http;

namespace EmailApi.Models
{
    /// <summary>
    /// Multipart/form-data payload accepted by POST /api/email/send.
    /// Supports a single recipient, multiple recipients, and file attachments.
    /// </summary>
    public class SendEmailForm
    {
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;

        /// <summary>
        /// Comma- or semicolon-separated list of recipient email addresses.
        /// Leave empty to fall back to the configured SmtpConfig:ToEmail.
        /// </summary>
        public string? Recipients { get; set; }

        /// <summary>
        /// Whether the body should be sent as HTML. Defaults to true.
        /// </summary>
        public bool IsHtml { get; set; } = true;

        /// <summary>
        /// Optional file attachments uploaded via multipart/form-data.
        /// </summary>
        public IFormFileCollection? Attachments { get; set; }

        /// <summary>
        /// Optional API key (alternative to the X-Api-Key header).
        /// </summary>
        public string? ApiKey { get; set; }
    }
}
