using System.ComponentModel.DataAnnotations;

namespace EmailApi.Models
{
    public class AppEntity
    {
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string AppName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? AppUrl { get; set; }

        [Required, MaxLength(128)]
        public string AppKey { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [MaxLength(256)]
        public string? ContactEmail { get; set; }

        public bool IsActive { get; set; } = true;

        public int? DailyQuota { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastUsedAt { get; set; }
    }

    public class EmailLogEntity
    {
        public long Id { get; set; }

        public int AppId { get; set; }
        public AppEntity? App { get; set; }

        [Required, MaxLength(150)]
        public string AppName { get; set; } = string.Empty;

        [Required, MaxLength(500)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Recipients { get; set; } = string.Empty;

        public int RecipientCount { get; set; }
        public int AttachmentCount { get; set; }
        public long AttachmentBytes { get; set; }
        public bool IsHtml { get; set; } = true;

        [MaxLength(2000)]
        public string? BodyPreview { get; set; }

        [Required, MaxLength(20)]
        public string Status { get; set; } = "Sent"; // Sent | Failed | Rejected

        [MaxLength(2000)]
        public string? ErrorMessage { get; set; }

        [MaxLength(45)]
        public string? IpAddress { get; set; }

        [MaxLength(500)]
        public string? UserAgent { get; set; }

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public int? DurationMs { get; set; }
    }
}
