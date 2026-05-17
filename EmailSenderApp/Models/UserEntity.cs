using System.ComponentModel.DataAnnotations;

namespace EmailApi.Models
{
    public class UserEntity
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [MaxLength(256)]
        public string? Email { get; set; }

        [Required, MaxLength(512)]
        public string PasswordHash { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<AppEntity> Services { get; set; } = new List<AppEntity>();
    }
}
