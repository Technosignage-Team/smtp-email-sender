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

        // ── Per-service sender ──────────────────────────────────────────────
        /// <summary>Owner account. Null for legacy admin-created apps.</summary>
        public int? UserId { get; set; }
        public UserEntity? User { get; set; }

        /// <summary>From email address for this service (overrides global SmtpConfig:FromEmail).</summary>
        [MaxLength(256)]
        public string? SenderEmail { get; set; }

        /// <summary>Display name shown in the From field (e.g. "Heelovo Support").</summary>
        [MaxLength(150)]
        public string? SenderName { get; set; }

        /// <summary>Optional SMTP username override (if different from global).</summary>
        [MaxLength(256)]
        public string? SmtpUsername { get; set; }

        /// <summary>Optional SMTP password override. Stored as-is; encrypt at rest in production.</summary>
        [MaxLength(512)]
        public string? SmtpPassword { get; set; }

        /// <summary>SMTP server hostname (e.g. smtp.gmail.com). Null = use global default.</summary>
        [MaxLength(256)]
        public string? SmtpServer { get; set; }

        /// <summary>SMTP port (e.g. 587, 465, 25). Null = use global default.</summary>
        public int? SmtpPort { get; set; }

        /// <summary>Encryption method: "TLS" (STARTTLS), "SSL" (implicit), or "None".</summary>
        [MaxLength(20)]
        public string? SmtpEncryption { get; set; }

        // ── Inbound IMAP listening ────────────────────────────────────────────
        public bool ImapEnabled { get; set; }

        [MaxLength(256)]
        public string? ImapServer { get; set; }

        public int? ImapPort { get; set; }

        [MaxLength(256)]
        public string? ImapUsername { get; set; }

        [MaxLength(512)]
        public string? ImapPassword { get; set; }

        public bool ImapUseSsl { get; set; } = true;

        /// <summary>Last processed IMAP UID — used to fetch only new messages.</summary>
        public long? LastImapUid { get; set; }

        public DateTime? LastImapPollAt { get; set; }

        public ICollection<EmailTemplateEntity> Templates { get; set; } = new List<EmailTemplateEntity>();

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
