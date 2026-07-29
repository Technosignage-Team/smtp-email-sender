using System.ComponentModel.DataAnnotations;

namespace EmailApi.Models
{
    public class IncomingEmailEntity
    {
        public long Id { get; set; }

        public int AppId { get; set; }
        public AppEntity? App { get; set; }

        [Required, MaxLength(150)]
        public string AppName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? MessageId { get; set; }

        [Required, MaxLength(256)]
        public string FromAddress { get; set; } = string.Empty;

        [MaxLength(256)]
        public string? FromName { get; set; }

        [Required, MaxLength(256)]
        public string ToAddress { get; set; } = string.Empty;

        [Required, MaxLength(500)]
        public string Subject { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? BodyPreview { get; set; }

        public string? BodyText { get; set; }
        public string? BodyHtml { get; set; }

        public bool HasAttachments { get; set; }
        public int AttachmentCount { get; set; }

        public long? ImapUid { get; set; }
        public bool IsRead { get; set; }

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class WebhookSubscriptionEntity
    {
        public int Id { get; set; }

        public int AppId { get; set; }
        public AppEntity? App { get; set; }

        [Required, MaxLength(1000)]
        public string Url { get; set; } = string.Empty;

        [Required, MaxLength(128)]
        public string Secret { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Events { get; set; } = "email.received";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class WebhookDeliveryLogEntity
    {
        public long Id { get; set; }

        public int WebhookSubscriptionId { get; set; }
        public WebhookSubscriptionEntity? WebhookSubscription { get; set; }

        public long IncomingEmailId { get; set; }
        public IncomingEmailEntity? IncomingEmail { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "Sent";

        public int? HttpStatusCode { get; set; }

        [MaxLength(2000)]
        public string? ErrorMessage { get; set; }

        public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
        public int? DurationMs { get; set; }
    }
}
