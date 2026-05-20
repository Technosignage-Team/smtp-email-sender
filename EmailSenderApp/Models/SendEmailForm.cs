using Microsoft.AspNetCore.Http;

namespace EmailApi.Models
{
    /// <summary>
    /// Multipart/form-data payload accepted by POST /api/email/send.
    /// Supports a single recipient, multiple recipients, and file attachments.
    /// </summary>
    public class SendEmailForm
    {
        /// <summary>
        /// Optional. Use a saved template by ID (preferred) or name.
        /// When supplied the template's Subject, Body and IsHtml are used unless
        /// the caller also provides Subject/Body, which then override the template values.
        /// </summary>
        public int? TemplateId { get; set; }
        public string? TemplateName { get; set; }

        public string? Subject { get; set; }
        public string? Body { get; set; }

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
