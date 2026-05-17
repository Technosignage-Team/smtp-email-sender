using System.ComponentModel.DataAnnotations;

namespace EmailApi.Models
{
    public class EmailTemplateEntity
    {
        public int Id { get; set; }

        public int AppId { get; set; }
        public AppEntity? App { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(500)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Body { get; set; } = string.Empty;

        public bool IsHtml { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
