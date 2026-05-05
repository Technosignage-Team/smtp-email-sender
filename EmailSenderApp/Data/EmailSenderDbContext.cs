using EmailApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Data
{
    public class EmailSenderDbContext : DbContext
    {
        public EmailSenderDbContext(DbContextOptions<EmailSenderDbContext> options) : base(options) { }

        public DbSet<AppEntity> Apps => Set<AppEntity>();
        public DbSet<EmailLogEntity> EmailLogs => Set<EmailLogEntity>();

        protected override void OnModelCreating(ModelBuilder b)
        {
            b.Entity<AppEntity>(e =>
            {
                e.ToTable("Apps");
                e.HasIndex(x => x.AppKey).IsUnique();
                e.HasIndex(x => x.AppName).IsUnique();
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
        }
    }
}
