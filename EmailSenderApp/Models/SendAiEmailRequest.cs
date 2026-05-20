using System.Text.Json;
using System.Text.Json.Serialization;

namespace EmailApi.Models
{
    /// <summary>
    /// JSON body accepted by POST /api/email/send-ai.
    /// Designed to be lenient so any external app can call the endpoint without knowing
    /// our exact schema — common field-name variants are all accepted.
    /// </summary>
    public class SendAiEmailRequest
    {
        // ── Auth ────────────────────────────────────────────────────────────
        /// <summary>Optional API key alternative to the X-Api-Key header.</summary>
        [JsonPropertyName("apiKey")]
        public string? ApiKey { get; set; }
        /// <summary>snake_case alias for apiKey — tracked so the response can hint the canonical name.</summary>
        [JsonPropertyName("api_key")]
        public string? ApiKeySnake { set { ApiKey ??= value; if (value != null) _usedAliases["api_key"] = "apiKey"; } }

        // ── Template (flexible) ─────────────────────────────────────────────
        /// <summary>
        /// Template reference: numeric ID (5), numeric string ("5"), or template name ("Welcome Email").
        /// If numeric → looks up by ID; otherwise looks up by name.
        /// When a template is found its Subject/Body/IsHtml are used unless the caller also
        /// supplies those fields, which then override the template values.
        /// </summary>
        [JsonConverter(typeof(TemplateRefConverter))]
        [JsonPropertyName("templateId")]
        public string? TemplateRef { get; set; }
        /// <summary>snake_case alias for templateId — tracked so the response can hint the canonical name.</summary>
        [JsonConverter(typeof(TemplateRefConverter))]
        [JsonPropertyName("template_id")]
        public string? TemplateIdSnake { set { TemplateRef ??= value; if (value != null) _usedAliases["template_id"] = "templateId"; } }

        /// <summary>Explicit template name lookup (alternative to templateId).</summary>
        public string? TemplateName { get; set; }
        /// <summary>snake_case alias for templateName — tracked so the response can hint the canonical name.</summary>
        [JsonPropertyName("template_name")]
        public string? TemplateNameSnake { set { TemplateName ??= value; if (value != null) _usedAliases["template_name"] = "templateName"; } }

        // ── Recipients (flexible) ───────────────────────────────────────────
        /// <summary>Array of recipient addresses. Also accepts a single address here.</summary>
        public List<string>? Recipients { get; set; }

        /// <summary>"recipient" — single-address alias accepted from external forms.</summary>
        public string? Recipient { get; set; }

        /// <summary>"to" — alias accepted from external forms.</summary>
        public string? To { get; set; }

        /// <summary>"email" / "recipientEmail" — aliases accepted from external forms.</summary>
        public string? Email { get; set; }

        [JsonPropertyName("recipientEmail")]
        public string? RecipientEmail { get; set; }
        /// <summary>snake_case alias for recipientEmail — tracked so the response can hint the canonical name.</summary>
        [JsonPropertyName("recipient_email")]
        public string? RecipientEmailSnake { set { RecipientEmail ??= value; if (value != null) _usedAliases["recipient_email"] = "recipientEmail"; } }

        // ── Alias tracking ───────────────────────────────────────────────────
        private readonly Dictionary<string, string> _usedAliases = new();

        /// <summary>
        /// Returns a dictionary of { usedAlias → canonicalName } for every non-standard
        /// field the caller sent. Null when no aliases were used.
        /// Included in every response so external apps know the preferred field names.
        /// </summary>
        [JsonIgnore]
        public Dictionary<string, string>? FieldHints =>
            _usedAliases.Count > 0 ? _usedAliases : null;

        // ── Content ─────────────────────────────────────────────────────────
        public string? Subject { get; set; }

        public string? Body { get; set; }

        /// <summary>Whether <see cref="Body"/> contains HTML. Defaults to true.</summary>
        public bool IsHtml { get; set; } = true;
    }

    /// <summary>
    /// Allows templateId to be sent as a JSON number (5), a numeric string ("5"),
    /// or a template name ("Welcome Email") — all stored as a string internally.
    /// </summary>
    internal sealed class TemplateRefConverter : JsonConverter<string?>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number) return reader.GetInt64().ToString();
            if (reader.TokenType == JsonTokenType.String)  return reader.GetString();
            if (reader.TokenType == JsonTokenType.Null)    return null;
            reader.Skip();
            return null;
        }

        public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }
}

