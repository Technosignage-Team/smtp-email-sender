namespace EmailApi.Models
{
    /// <summary>
    /// Request body for POST /api/ai/chat — the AI-friendly chat endpoint.
    /// </summary>
    public class AiChatRequest
    {
        /// <summary>The latest user message to process.</summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>Previous conversation turns (oldest first).</summary>
        public List<AiChatHistoryItem> History { get; set; } = new();

        /// <summary>Optional Gemini API key — used when the server has none configured.</summary>
        public string? GeminiApiKey { get; set; }

        /// <summary>Optional email API key — alternative to the X-Api-Key header.</summary>
        public string? EmailApiKey { get; set; }
    }

    public class AiChatHistoryItem
    {
        /// <summary>"user" or "assistant"</summary>
        public string Role { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;
    }
}
