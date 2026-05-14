namespace EmailApi.Models
{
    /// <summary>
    /// JSON body accepted by POST /api/email/send-ai.
    /// Designed for AI agents (Gemini, OpenAI, Claude) and browser fetch/axios calls.
    /// </summary>
    public class SendAiEmailRequest
    {
        /// <summary>Optional API key alternative to the X-Api-Key header.</summary>
        public string? ApiKey { get; set; }

        public string Subject { get; set; } = string.Empty;

        public string Body { get; set; } = string.Empty;

        /// <summary>Whether <see cref="Body"/> contains HTML. Defaults to true.</summary>
        public bool IsHtml { get; set; } = true;

        /// <summary>List of recipient email addresses.</summary>
        public List<string> Recipients { get; set; } = new();
    }
}
