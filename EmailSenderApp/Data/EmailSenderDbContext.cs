using EmailApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Data
{
    public class EmailSenderDbContext : DbContext
    {
        public EmailSenderDbContext(DbContextOptions<EmailSenderDbContext> options) : base(options) { }

        public DbSet<AppEntity> Apps => Set<AppEntity>();
        public DbSet<EmailLogEntity> EmailLogs => Set<EmailLogEntity>();
        public DbSet<UserEntity> Users => Set<UserEntity>();
        public DbSet<EmailTemplateEntity> EmailTemplates => Set<EmailTemplateEntity>();
        public DbSet<IncomingEmailEntity> IncomingEmails => Set<IncomingEmailEntity>();
        public DbSet<WebhookSubscriptionEntity> WebhookSubscriptions => Set<WebhookSubscriptionEntity>();
        public DbSet<WebhookDeliveryLogEntity> WebhookDeliveryLogs => Set<WebhookDeliveryLogEntity>();

        protected override void OnModelCreating(ModelBuilder b)
        {
            b.Entity<AppEntity>(e =>
            {
                e.ToTable("Apps");
                e.HasIndex(x => x.AppKey).IsUnique();
                e.HasIndex(x => x.AppName).IsUnique();
                e.HasOne(x => x.User)
                    .WithMany(u => u.Services)
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            b.Entity<UserEntity>(e =>
            {
                e.ToTable("Users");
                e.HasIndex(x => x.Username).IsUnique();
            });

            b.Entity<EmailTemplateEntity>(e =>
            {
                e.ToTable("EmailTemplates");
                e.HasOne(x => x.App)
                    .WithMany(a => a.Templates)
                    .HasForeignKey(x => x.AppId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            b.Entity<EmailLogEntity>(e =>
            {
                e.ToTable("EmailLogs");
                e.HasOne(x => x.App)
                    .WithMany()
                    .HasForeignKey(x => x.AppId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(x => new { x.AppId, x.SentAt });
                e.HasIndex(x => x.SentAt);
                e.HasIndex(x => x.Status);
            });

            b.Entity<IncomingEmailEntity>(e =>
            {
                e.ToTable("IncomingEmails");
                e.HasOne(x => x.App)
                    .WithMany()
                    .HasForeignKey(x => x.AppId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(x => new { x.AppId, x.ReceivedAt });
                e.HasIndex(x => x.ReceivedAt);
                e.HasIndex(x => x.IsRead);
                e.HasIndex(x => new { x.AppId, x.MessageId })
                    .IsUnique()
                    .HasFilter("[MessageId] IS NOT NULL");
            });

            b.Entity<WebhookSubscriptionEntity>(e =>
            {
                e.ToTable("WebhookSubscriptions");
                e.HasOne(x => x.App)
                    .WithMany()
                    .HasForeignKey(x => x.AppId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasIndex(x => x.AppId);
            });

            b.Entity<WebhookDeliveryLogEntity>(e =>
            {
                e.ToTable("WebhookDeliveryLogs");
                e.HasOne(x => x.WebhookSubscription)
                    .WithMany()
                    .HasForeignKey(x => x.WebhookSubscriptionId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.IncomingEmail)
                    .WithMany()
                    .HasForeignKey(x => x.IncomingEmailId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(x => new { x.WebhookSubscriptionId, x.AttemptedAt });
                e.HasIndex(x => x.IncomingEmailId);
            });
        }
    }
}
