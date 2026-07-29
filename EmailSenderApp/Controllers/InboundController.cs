using EmailApi.Data;
using EmailApi.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Controllers
{
    /// <summary>
    /// Public inbound email API for external apps.
    /// Authenticate with the service's X-Api-Key header (same key used for sending).
    /// </summary>
    [ApiController]
    [Route("api/inbound")]
    [EnableCors("AllowAll")]
    [Produces("application/json")]
    public class InboundController : ControllerBase
    {
        private const string ApiKeyHeader = "X-Api-Key";

        private readonly EmailSenderDbContext _db;

        public InboundController(EmailSenderDbContext db) => _db = db;

        /// <summary>GET /api/inbound/emails — list received emails for this service.</summary>
        [HttpGet("emails")]
        public async Task<IActionResult> ListEmails(
            [FromQuery] int  skip   = 0,
            [FromQuery] int  take   = 50,
            [FromQuery] bool? isRead = null,
            [FromQuery] string? from = null,
            [FromQuery] string? to   = null)
        {
            var app = await ResolveAppAsync();
            if (app == null) return Unauthorized(new { error = "Missing or invalid API key." });

            take = Math.Clamp(take, 1, 200);
            skip = Math.Max(0, skip);

            var query = _db.IncomingEmails.Where(e => e.AppId == app.Id);

            if (isRead.HasValue) query = query.Where(e => e.IsRead == isRead.Value);
            if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var fromDt))
                query = query.Where(e => e.ReceivedAt >= fromDt.ToUniversalTime());
            if (!string.IsNullOrWhiteSpace(to) && DateTime.TryParse(to, out var toDt))
                query = query.Where(e => e.ReceivedAt <= toDt.ToUniversalTime());

            var total = await query.CountAsync();
            var rows  = await query
                .OrderByDescending(e => e.ReceivedAt)
                .Skip(skip)
                .Take(take)
                .Select(e => ToListDto(e))
                .ToListAsync();

            return Ok(new { success = true, total, rows, appName = app.AppName });
        }

        /// <summary>GET /api/inbound/emails/{id} — full email details.</summary>
        [HttpGet("emails/{id:long}")]
        public async Task<IActionResult> GetEmail(long id)
        {
            var app = await ResolveAppAsync();
            if (app == null) return Unauthorized(new { error = "Missing or invalid API key." });

            var email = await _db.IncomingEmails
                .FirstOrDefaultAsync(e => e.Id == id && e.AppId == app.Id);

            if (email == null) return NotFound(new { error = "Email not found." });

            return Ok(new { success = true, email = ToDetailDto(email) });
        }

        /// <summary>PATCH /api/inbound/emails/{id}/read — mark email as read.</summary>
        [HttpPatch("emails/{id:long}/read")]
        public async Task<IActionResult> MarkRead(long id, [FromBody] MarkReadRequest? req)
        {
            var app = await ResolveAppAsync();
            if (app == null) return Unauthorized(new { error = "Missing or invalid API key." });

            var email = await _db.IncomingEmails
                .FirstOrDefaultAsync(e => e.Id == id && e.AppId == app.Id);

            if (email == null) return NotFound(new { error = "Email not found." });

            email.IsRead = req?.IsRead ?? true;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, id = email.Id, isRead = email.IsRead });
        }

        /// <summary>GET /api/inbound/unread-count — quick poll helper for external apps.</summary>
        [HttpGet("unread-count")]
        public async Task<IActionResult> UnreadCount()
        {
            var app = await ResolveAppAsync();
            if (app == null) return Unauthorized(new { error = "Missing or invalid API key." });

            var count = await _db.IncomingEmails
                .CountAsync(e => e.AppId == app.Id && !e.IsRead);

            return Ok(new { success = true, unreadCount = count, appName = app.AppName });
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private async Task<AppEntity?> ResolveAppAsync()
        {
            if (!Request.Headers.TryGetValue(ApiKeyHeader, out var h) || string.IsNullOrWhiteSpace(h))
                return null;

            var key = h.ToString().Trim();
            var app = await _db.Apps.FirstOrDefaultAsync(a => a.AppKey == key);
            if (app == null || !app.IsActive) return null;
            return app;
        }

        private static object ToListDto(IncomingEmailEntity e) => new
        {
            e.Id,
            from        = e.FromAddress,
            fromName    = e.FromName,
            to          = e.ToAddress,
            e.Subject,
            bodyPreview = e.BodyPreview,
            e.HasAttachments,
            e.AttachmentCount,
            e.IsRead,
            e.ReceivedAt,
        };

        private static object ToDetailDto(IncomingEmailEntity e) => new
        {
            e.Id,
            e.AppId,
            e.AppName,
            from        = e.FromAddress,
            fromName    = e.FromName,
            to          = e.ToAddress,
            e.Subject,
            bodyPreview = e.BodyPreview,
            bodyText    = e.BodyText,
            bodyHtml    = e.BodyHtml,
            e.HasAttachments,
            e.AttachmentCount,
            e.IsRead,
            e.ReceivedAt,
            messageId   = e.MessageId,
        };

        public class MarkReadRequest
        {
            public bool IsRead { get; set; } = true;
        }
    }
}
