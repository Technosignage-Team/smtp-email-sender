using System.Security.Claims;
using EmailApi.Data;
using EmailApi.Models;
using EmailApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppsController : ControllerBase
    {
        private readonly EmailSenderDbContext _db;
        private readonly ITokenService        _tokens;

        public AppsController(EmailSenderDbContext db, ITokenService tokens)
        {
            _db     = db;
            _tokens = tokens;
        }

        public class AppDto
        {
            public int Id { get; set; }
            public string AppName { get; set; } = string.Empty;
            public string? AppUrl { get; set; }
            public string AppKey { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string? ContactEmail { get; set; }
            public bool IsActive { get; set; }
            public int? DailyQuota { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime UpdatedAt { get; set; }
            public DateTime? LastUsedAt { get; set; }
            public int LogsCount { get; set; }
        }

        public class CreateAppRequest
        {
            public string AppName { get; set; } = string.Empty;
            public string? AppUrl { get; set; }
            public string? Description { get; set; }
            public string? ContactEmail { get; set; }
            public int? DailyQuota { get; set; }
        }

        public class UpdateAppRequest
        {
            public string? AppName { get; set; }
            public string? AppUrl { get; set; }
            public string? Description { get; set; }
            public string? ContactEmail { get; set; }
            public bool? IsActive { get; set; }
            public int? DailyQuota { get; set; }
        }

        // GET /api/apps
        [HttpGet]
        public async Task<IActionResult> List()
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var items = await _db.Apps
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AppDto
                {
                    Id          = a.Id,
                    AppName     = a.AppName,
                    AppUrl      = a.AppUrl,
                    AppKey      = a.AppKey,
                    Description = a.Description,
                    ContactEmail= a.ContactEmail,
                    IsActive    = a.IsActive,
                    DailyQuota  = a.DailyQuota,
                    CreatedAt   = a.CreatedAt,
                    UpdatedAt   = a.UpdatedAt,
                    LastUsedAt  = a.LastUsedAt,
                    LogsCount   = _db.EmailLogs.Count(l => l.AppId == a.Id),
                })
                .ToListAsync();
            return Ok(items);
        }

        // POST /api/apps
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAppRequest req)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            if (string.IsNullOrWhiteSpace(req.AppName))
                return BadRequest(new { error = "AppName is required." });

            if (await _db.Apps.AnyAsync(a => a.AppName == req.AppName))
                return Conflict(new { error = "An app with this name already exists." });

            var entity = new AppEntity
            {
                AppName      = req.AppName.Trim(),
                AppUrl       = req.AppUrl?.Trim(),
                Description  = req.Description?.Trim(),
                ContactEmail = req.ContactEmail?.Trim(),
                DailyQuota   = req.DailyQuota,
                AppKey       = GenerateApiKey(),
                IsActive     = true,
            };

            _db.Apps.Add(entity);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(List), new { id = entity.Id }, ToDto(entity, 0));
        }

        // PATCH /api/apps/{id}
        [HttpPatch("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateAppRequest req)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var app = await _db.Apps.FindAsync(id);
            if (app == null) return NotFound();

            if (req.AppName      != null) app.AppName      = req.AppName.Trim();
            if (req.AppUrl       != null) app.AppUrl        = req.AppUrl.Trim();
            if (req.Description  != null) app.Description   = req.Description.Trim();
            if (req.ContactEmail != null) app.ContactEmail  = req.ContactEmail.Trim();
            if (req.IsActive.HasValue)    app.IsActive      = req.IsActive.Value;
            if (req.DailyQuota.HasValue)  app.DailyQuota    = req.DailyQuota.Value;
            app.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            var count = await _db.EmailLogs.CountAsync(l => l.AppId == app.Id);
            return Ok(ToDto(app, count));
        }

        // POST /api/apps/{id}/regenerate-key
        [HttpPost("{id:int}/regenerate-key")]
        public async Task<IActionResult> RegenerateKey(int id)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var app = await _db.Apps.FindAsync(id);
            if (app == null) return NotFound();
            app.AppKey    = GenerateApiKey();
            app.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            var count = await _db.EmailLogs.CountAsync(l => l.AppId == app.Id);
            return Ok(ToDto(app, count));
        }

        // DELETE /api/apps/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var app = await _db.Apps.FindAsync(id);
            if (app == null) return NotFound();
            app.IsActive  = false;
            app.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/apps/{id}/logs
        [HttpGet("{id:int}/logs")]
        public async Task<IActionResult> Logs(int id, [FromQuery] int take = 100)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            take = Math.Clamp(take, 1, 1000);
            var rows = await _db.EmailLogs
                .Where(l => l.AppId == id)
                .OrderByDescending(l => l.SentAt)
                .Take(take)
                .Select(l => new {
                    l.Id, l.Subject, l.Recipients, l.RecipientCount, l.AttachmentCount,
                    l.AttachmentBytes, l.IsHtml, l.Status, l.ErrorMessage, l.IpAddress,
                    l.UserAgent, l.SentAt, l.DurationMs,
                })
                .ToListAsync();
            return Ok(rows);
        }

        // GET /api/apps/logs  (all apps)
        [HttpGet("logs")]
        public async Task<IActionResult> AllLogs([FromQuery] int take = 200)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            take = Math.Clamp(take, 1, 1000);
            var rows = await _db.EmailLogs
                .OrderByDescending(l => l.SentAt)
                .Take(take)
                .Select(l => new {
                    l.Id, l.AppId, l.AppName, l.Subject, l.Recipients, l.RecipientCount,
                    l.AttachmentCount, l.AttachmentBytes, l.IsHtml, l.Status, l.ErrorMessage,
                    l.IpAddress, l.SentAt, l.DurationMs,
                })
                .ToListAsync();
            return Ok(rows);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private bool IsSuperAdmin()
        {
            var auth = Request.Headers.Authorization.ToString();
            if (!auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return false;
            var principal = _tokens.Validate(auth[7..]);
            return principal?.FindFirstValue(ClaimTypes.Role) == "superadmin";
        }

        private static AppDto ToDto(AppEntity a, int logsCount) => new()
        {
            Id           = a.Id,
            AppName      = a.AppName,
            AppUrl       = a.AppUrl,
            AppKey       = a.AppKey,
            Description  = a.Description,
            ContactEmail = a.ContactEmail,
            IsActive     = a.IsActive,
            DailyQuota   = a.DailyQuota,
            CreatedAt    = a.CreatedAt,
            UpdatedAt    = a.UpdatedAt,
            LastUsedAt   = a.LastUsedAt,
            LogsCount    = logsCount,
        };

        private static string GenerateApiKey()
        {
            var bytes = new byte[32];
            System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
            var b64 = Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
            return $"esk_{b64}";
        }
    }
}
