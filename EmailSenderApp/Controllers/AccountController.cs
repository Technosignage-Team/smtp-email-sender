using System.Security.Claims;
using EmailApi.Data;
using EmailApi.Models;
using EmailApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Controllers
{
    [ApiController]
    [Route("api/account")]
    [Produces("application/json")]
    public class AccountController : ControllerBase
    {
        private readonly EmailSenderDbContext _db;
        private readonly ITokenService        _tokens;

        public AccountController(EmailSenderDbContext db, ITokenService tokens)
        {
            _db     = db;
            _tokens = tokens;
        }

        // ── Auth ──────────────────────────────────────────────────────────────

        /// <summary>POST /api/account/register</summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Username and password are required." });

            if (req.Password.Length < 6)
                return BadRequest(new { error = "Password must be at least 6 characters." });

            if (await _db.Users.AnyAsync(u => u.Username == req.Username))
                return Conflict(new { error = "Username already taken." });

            var user = new UserEntity
            {
                Username     = req.Username.Trim(),
                Email        = req.Email?.Trim(),
                PasswordHash = PasswordHelper.Hash(req.Password),
                Role         = "user",
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new { token = _tokens.GenerateToken(user), user = ToUserDto(user) });
        }

        /// <summary>POST /api/account/login</summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Username and password are required." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
            if (user == null || !PasswordHelper.Verify(req.Password, user.PasswordHash))
                return Unauthorized(new { error = "Invalid username or password." });

            if (!user.IsActive)
                return StatusCode(403, new { error = "Account is deactivated." });

            return Ok(new { token = _tokens.GenerateToken(user), user = ToUserDto(user) });
        }

        /// <summary>GET /api/account/me  [auth required]</summary>
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            var user = await _db.Users.FindAsync(userId.Value);
            if (user == null) return Unauthorized(new { error = "User not found." });

            return Ok(ToUserDto(user));
        }

        // ── Services (Apps scoped to the authenticated user) ──────────────────

        /// <summary>GET /api/account/services</summary>
        [HttpGet("services")]
        public async Task<IActionResult> ListServices()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            var services = await _db.Apps
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => ToServiceDto(a))
                .ToListAsync();

            return Ok(services);
        }

        /// <summary>POST /api/account/services</summary>
        [HttpPost("services")]
        public async Task<IActionResult> CreateService([FromBody] CreateServiceRequest req)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            if (string.IsNullOrWhiteSpace(req.Name))
                return BadRequest(new { error = "Service name is required." });

            if (string.IsNullOrWhiteSpace(req.SenderEmail))
                return BadRequest(new { error = "Sender email is required." });

            if (await _db.Apps.AnyAsync(a => a.UserId == userId && a.AppName == req.Name))
                return Conflict(new { error = "You already have a service with this name." });

            var app = new AppEntity
            {
                UserId         = userId,
                AppName        = req.Name.Trim(),
                SenderEmail    = req.SenderEmail.Trim(),
                SenderName     = req.SenderName?.Trim(),
                SmtpUsername   = req.SmtpUsername?.Trim(),
                SmtpPassword   = req.SmtpPassword,
                SmtpServer     = req.SmtpServer?.Trim(),
                SmtpPort       = req.SmtpPort,
                SmtpEncryption = req.SmtpEncryption?.Trim(),
                Description    = req.Description?.Trim(),
                AppKey         = GenerateApiKey(),
                IsActive       = true,
            };

            _db.Apps.Add(app);
            try { await _db.SaveChangesAsync(); }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
                when (ex.InnerException?.Message.Contains("UQ_Apps_AppName") == true ||
                      ex.InnerException?.Message.Contains("duplicate key") == true)
            {
                return Conflict(new { error = "A service with this name already exists globally. Please choose a different name." });
            }
            return Ok(ToServiceDto(app));
        }

        /// <summary>PATCH /api/account/services/{id}</summary>
        [HttpPatch("services/{id:int}")]
        public async Task<IActionResult> UpdateService(int id, [FromBody] UpdateServiceRequest req)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (app == null) return NotFound();

            if (req.Name           != null) app.AppName        = req.Name.Trim();
            if (req.SenderEmail    != null) app.SenderEmail     = req.SenderEmail.Trim();
            if (req.SenderName     != null) app.SenderName      = req.SenderName.Trim();
            if (req.SmtpUsername   != null) app.SmtpUsername    = req.SmtpUsername.Trim();
            if (req.SmtpPassword   != null) app.SmtpPassword    = req.SmtpPassword;
            if (req.SmtpServer     != null) app.SmtpServer      = req.SmtpServer.Trim();
            if (req.SmtpPort.HasValue)      app.SmtpPort        = req.SmtpPort.Value;
            if (req.SmtpEncryption != null) app.SmtpEncryption  = req.SmtpEncryption.Trim();
            if (req.IsActive.HasValue)      app.IsActive        = req.IsActive.Value;
            app.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ToServiceDto(app));
        }

        /// <summary>DELETE /api/account/services/{id}</summary>
        [HttpDelete("services/{id:int}")]
        public async Task<IActionResult> DeleteService(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (app == null) return NotFound();

            app.IsActive  = false;
            app.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>POST /api/account/services/{id}/regenerate-key</summary>
        [HttpPost("services/{id:int}/regenerate-key")]
        public async Task<IActionResult> RegenerateKey(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            var app = await _db.Apps.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (app == null) return NotFound();

            app.AppKey    = GenerateApiKey();
            app.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ToServiceDto(app));
        }

        // ── Templates ─────────────────────────────────────────────────────────

        /// <summary>GET /api/account/services/{id}/templates</summary>
        [HttpGet("services/{id:int}/templates")]
        public async Task<IActionResult> ListTemplates(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            if (!await _db.Apps.AnyAsync(a => a.Id == id && a.UserId == userId))
                return NotFound();

            var templates = await _db.EmailTemplates
                .Where(t => t.AppId == id)
                .OrderBy(t => t.CreatedAt)
                .Select(t => ToTemplateDto(t))
                .ToListAsync();

            return Ok(templates);
        }

        /// <summary>POST /api/account/services/{id}/templates</summary>
        [HttpPost("services/{id:int}/templates")]
        public async Task<IActionResult> CreateTemplate(int id, [FromBody] TemplateRequest req)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            if (!await _db.Apps.AnyAsync(a => a.Id == id && a.UserId == userId))
                return NotFound();

            if (string.IsNullOrWhiteSpace(req.Name)    ||
                string.IsNullOrWhiteSpace(req.Subject)  ||
                string.IsNullOrWhiteSpace(req.Body))
                return BadRequest(new { error = "Name, Subject and Body are required." });

            var tmpl = new EmailTemplateEntity
            {
                AppId   = id,
                Name    = req.Name.Trim(),
                Subject = req.Subject.Trim(),
                Body    = req.Body,
                IsHtml  = req.IsHtml,
            };
            _db.EmailTemplates.Add(tmpl);
            await _db.SaveChangesAsync();
            return Ok(ToTemplateDto(tmpl));
        }

        /// <summary>PATCH /api/account/services/{id}/templates/{tid}</summary>
        [HttpPatch("services/{id:int}/templates/{tid:int}")]
        public async Task<IActionResult> UpdateTemplate(int id, int tid, [FromBody] TemplateRequest req)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            var tmpl = await _db.EmailTemplates
                .FirstOrDefaultAsync(t => t.Id == tid && t.AppId == id && t.App!.UserId == userId);
            if (tmpl == null) return NotFound();

            if (req.Name    != null) tmpl.Name    = req.Name.Trim();
            if (req.Subject != null) tmpl.Subject = req.Subject.Trim();
            if (req.Body    != null) tmpl.Body    = req.Body;
            tmpl.IsHtml    = req.IsHtml;
            tmpl.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ToTemplateDto(tmpl));
        }

        /// <summary>DELETE /api/account/services/{id}/templates/{tid}</summary>
        [HttpDelete("services/{id:int}/templates/{tid:int}")]
        public async Task<IActionResult> DeleteTemplate(int id, int tid)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            var tmpl = await _db.EmailTemplates
                .FirstOrDefaultAsync(t => t.Id == tid && t.AppId == id && t.App!.UserId == userId);
            if (tmpl == null) return NotFound();

            _db.EmailTemplates.Remove(tmpl);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── Email Logs (own logs) ─────────────────────────────────────────────

        /// <summary>GET /api/account/logs — returns paginated logs for the current user's services.</summary>
        [HttpGet("logs")]
        public async Task<IActionResult> GetMyLogs(
            [FromQuery] int    skip   = 0,
            [FromQuery] int    take   = 100,
            [FromQuery] string? status = null,
            [FromQuery] string? from   = null,
            [FromQuery] string? to     = null)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { error = "Not authenticated." });

            take = Math.Clamp(take, 1, 500);
            skip = Math.Max(0, skip);

            var query = _db.EmailLogs.Where(l => l.App!.UserId == userId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(l => l.Status == status);
            if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var fromDt))
                query = query.Where(l => l.SentAt >= fromDt.ToUniversalTime());
            if (!string.IsNullOrWhiteSpace(to) && DateTime.TryParse(to, out var toDt))
                query = query.Where(l => l.SentAt <= toDt.ToUniversalTime());

            var total = await query.CountAsync();
            var rows  = await query
                .OrderByDescending(l => l.SentAt)
                .Skip(skip)
                .Take(take)
                .Select(l => new {
                    l.Id, l.AppId, l.AppName, l.Subject, l.Recipients, l.RecipientCount,
                    l.Status, l.ErrorMessage, l.IsHtml, l.AttachmentCount, l.AttachmentBytes,
                    l.IpAddress, l.SentAt, l.DurationMs,
                })
                .ToListAsync();

            return Ok(new { total, rows });
        }

        // ── Admin Endpoints (superadmin only) ─────────────────────────────────

        /// <summary>GET /api/account/admin/users — list all users.</summary>
        [HttpGet("admin/users")]
        public async Task<IActionResult> AdminListUsers(
            [FromQuery] int skip = 0,
            [FromQuery] int take = 100)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            take = Math.Clamp(take, 1, 500);
            skip = Math.Max(0, skip);

            var total = await _db.Users.CountAsync();
            var users = await _db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Select(u => new {
                    u.Id, u.Username, u.Email, u.Role, u.IsActive, u.CreatedAt,
                    servicesCount = _db.Apps.Count(a => a.UserId == u.Id),
                })
                .ToListAsync();

            return Ok(new { total, users });
        }

        /// <summary>PATCH /api/account/admin/users/{id}/status — activate or deactivate a user.</summary>
        [HttpPatch("admin/users/{id:int}/status")]
        public async Task<IActionResult> AdminUpdateUserStatus(int id, [FromBody] AdminUserStatusRequest req)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsActive  = req.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { user.Id, user.Username, user.Role, user.IsActive });
        }

        /// <summary>PATCH /api/account/admin/users/{id}/role — change a user's role.</summary>
        [HttpPatch("admin/users/{id:int}/role")]
        public async Task<IActionResult> AdminUpdateUserRole(int id, [FromBody] AdminUserRoleRequest req)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            if (req.Role != "user" && req.Role != "superadmin")
                return BadRequest(new { error = "Role must be 'user' or 'superadmin'." });

            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.Role      = req.Role;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { user.Id, user.Username, user.Role, user.IsActive });
        }

        /// <summary>GET /api/account/admin/logs — all logs with optional filters.</summary>
        [HttpGet("admin/logs")]
        public async Task<IActionResult> AdminGetLogs(
            [FromQuery] int?    userId = null,
            [FromQuery] int?    appId  = null,
            [FromQuery] string? status = null,
            [FromQuery] string? from   = null,
            [FromQuery] string? to     = null,
            [FromQuery] int     skip   = 0,
            [FromQuery] int     take   = 200)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            take = Math.Clamp(take, 1, 500);
            skip = Math.Max(0, skip);

            var query = _db.EmailLogs.AsQueryable();

            if (userId.HasValue)
                query = query.Where(l => l.App!.UserId == userId.Value);
            if (appId.HasValue)
                query = query.Where(l => l.AppId == appId.Value);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(l => l.Status == status);
            if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var fromDt))
                query = query.Where(l => l.SentAt >= fromDt.ToUniversalTime());
            if (!string.IsNullOrWhiteSpace(to) && DateTime.TryParse(to, out var toDt))
                query = query.Where(l => l.SentAt <= toDt.ToUniversalTime());

            var total = await query.CountAsync();
            var rows  = await query
                .OrderByDescending(l => l.SentAt)
                .Skip(skip)
                .Take(take)
                .Select(l => new {
                    l.Id, l.AppId, l.AppName, l.Subject, l.Recipients, l.RecipientCount,
                    l.Status, l.ErrorMessage, l.IsHtml, l.AttachmentCount, l.AttachmentBytes,
                    l.IpAddress, l.SentAt, l.DurationMs,
                    ownerId       = l.App != null ? l.App.UserId : (int?)null,
                    ownerUsername = l.App != null ? _db.Users
                        .Where(u => u.Id == l.App.UserId)
                        .Select(u => u.Username)
                        .FirstOrDefault() : null,
                })
                .ToListAsync();

            return Ok(new { total, rows });
        }

        /// <summary>GET /api/account/admin/services — all services across all users.</summary>
        [HttpGet("admin/services")]
        public async Task<IActionResult> AdminListServices(
            [FromQuery] int? userId = null,
            [FromQuery] int  skip   = 0,
            [FromQuery] int  take   = 100)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            take = Math.Clamp(take, 1, 500);
            skip = Math.Max(0, skip);

            var query = _db.Apps.AsQueryable();
            if (userId.HasValue) query = query.Where(a => a.UserId == userId.Value);

            var total    = await query.CountAsync();
            var services = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Select(a => new {
                    a.Id, a.AppName, a.AppKey, a.SenderEmail, a.SenderName,
                    a.SmtpServer, a.SmtpPort, a.SmtpEncryption,
                    a.IsActive, a.UserId, a.Description, a.CreatedAt, a.UpdatedAt, a.LastUsedAt,
                    ownerUsername = _db.Users
                        .Where(u => u.Id == a.UserId)
                        .Select(u => u.Username)
                        .FirstOrDefault(),
                    logsCount = _db.EmailLogs.Count(l => l.AppId == a.Id),
                })
                .ToListAsync();

            return Ok(new { total, services });
        }

        /// <summary>POST /api/account/admin/services — create a service for any user.</summary>
        [HttpPost("admin/services")]
        public async Task<IActionResult> AdminCreateService([FromBody] AdminCreateServiceRequest req)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            if (string.IsNullOrWhiteSpace(req.Name))
                return BadRequest(new { error = "Service name is required." });
            if (string.IsNullOrWhiteSpace(req.SenderEmail))
                return BadRequest(new { error = "Sender email is required." });
            if (req.UserId.HasValue && !await _db.Users.AnyAsync(u => u.Id == req.UserId.Value))
                return NotFound(new { error = "Target user not found." });

            var app = new AppEntity
            {
                UserId         = req.UserId,
                AppName        = req.Name.Trim(),
                SenderEmail    = req.SenderEmail.Trim(),
                SenderName     = req.SenderName?.Trim(),
                SmtpUsername   = req.SmtpUsername?.Trim(),
                SmtpPassword   = req.SmtpPassword,
                SmtpServer     = req.SmtpServer?.Trim(),
                SmtpPort       = req.SmtpPort,
                SmtpEncryption = req.SmtpEncryption?.Trim(),
                Description    = req.Description?.Trim(),
                AppKey         = GenerateApiKey(),
                IsActive       = true,
            };

            _db.Apps.Add(app);
            try { await _db.SaveChangesAsync(); }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
                when (ex.InnerException?.Message.Contains("duplicate key") == true)
            {
                return Conflict(new { error = "A service with this name already exists." });
            }
            return Ok(ToServiceDto(app));
        }

        /// <summary>PATCH /api/account/admin/services/{id} — update any service.</summary>
        [HttpPatch("admin/services/{id:int}")]
        public async Task<IActionResult> AdminUpdateService(int id, [FromBody] UpdateServiceRequest req)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var app = await _db.Apps.FindAsync(id);
            if (app == null) return NotFound();

            if (req.Name           != null) app.AppName        = req.Name.Trim();
            if (req.SenderEmail    != null) app.SenderEmail     = req.SenderEmail.Trim();
            if (req.SenderName     != null) app.SenderName      = req.SenderName.Trim();
            if (req.SmtpUsername   != null) app.SmtpUsername    = req.SmtpUsername.Trim();
            if (req.SmtpPassword   != null) app.SmtpPassword    = req.SmtpPassword;
            if (req.SmtpServer     != null) app.SmtpServer      = req.SmtpServer.Trim();
            if (req.SmtpPort.HasValue)      app.SmtpPort        = req.SmtpPort.Value;
            if (req.SmtpEncryption != null) app.SmtpEncryption  = req.SmtpEncryption.Trim();
            if (req.IsActive.HasValue)      app.IsActive        = req.IsActive.Value;
            app.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ToServiceDto(app));
        }

        /// <summary>DELETE /api/account/admin/services/{id} — deactivate any service.</summary>
        [HttpDelete("admin/services/{id:int}")]
        public async Task<IActionResult> AdminDeleteService(int id)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var app = await _db.Apps.FindAsync(id);
            if (app == null) return NotFound();

            app.IsActive  = false;
            app.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>POST /api/account/admin/services/{id}/regenerate-key — regenerate API key for any service.</summary>
        [HttpPost("admin/services/{id:int}/regenerate-key")]
        public async Task<IActionResult> AdminRegenerateKey(int id)
        {
            if (!IsSuperAdmin()) return Unauthorized(new { error = "Superadmin access required." });

            var app = await _db.Apps.FindAsync(id);
            if (app == null) return NotFound();

            app.AppKey    = GenerateApiKey();
            app.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ToServiceDto(app));
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private int? GetUserId()
        {
            var auth = Request.Headers.Authorization.ToString();
            if (!auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
            var principal = _tokens.Validate(auth[7..]);
            var sub = principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? principal?.FindFirstValue("sub");
            return int.TryParse(sub, out var id) ? id : null;
        }

        private string? GetUserRole()
        {
            var auth = Request.Headers.Authorization.ToString();
            if (!auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
            var principal = _tokens.Validate(auth[7..]);
            return principal?.FindFirstValue(ClaimTypes.Role);
        }

        private bool IsSuperAdmin() => GetUserRole() == "superadmin";

        private static object ToUserDto(UserEntity u) => new
        {
            u.Id, u.Username, u.Email, u.CreatedAt, role = u.Role
        };

        private static object ToServiceDto(AppEntity a) => new
        {
            a.Id,
            name            = a.AppName,
            apiKey          = a.AppKey,
            senderEmail     = a.SenderEmail,
            senderName      = a.SenderName,
            smtpUsername    = a.SmtpUsername,
            hasSmtpPassword = !string.IsNullOrEmpty(a.SmtpPassword),
            smtpServer      = a.SmtpServer,
            smtpPort        = a.SmtpPort,
            smtpEncryption  = a.SmtpEncryption,
            a.IsActive,
            a.Description,
            a.CreatedAt,
            a.UpdatedAt,
            a.LastUsedAt,
        };

        private static object ToTemplateDto(EmailTemplateEntity t) => new
        {
            t.Id, t.AppId, t.Name, t.Subject, t.Body, t.IsHtml, t.CreatedAt, t.UpdatedAt
        };

        private static string GenerateApiKey()
        {
            var bytes = new byte[32];
            System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
            var b64 = Convert.ToBase64String(bytes)
                .Replace("+", "-").Replace("/", "_").TrimEnd('=');
            return $"esk_{b64}";
        }

        // ── Request DTOs ──────────────────────────────────────────────────────

        public class RegisterRequest
        {
            public string  Username { get; set; } = string.Empty;
            public string  Password { get; set; } = string.Empty;
            public string? Email    { get; set; }
        }

        public class LoginRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class CreateServiceRequest
        {
            public string  Name           { get; set; } = string.Empty;
            public string  SenderEmail    { get; set; } = string.Empty;
            public string? SenderName     { get; set; }
            public string? SmtpUsername   { get; set; }
            public string? SmtpPassword   { get; set; }
            public string? SmtpServer     { get; set; }
            public int?    SmtpPort       { get; set; }
            public string? SmtpEncryption { get; set; }
            public string? Description    { get; set; }
        }

        public class UpdateServiceRequest
        {
            public string? Name           { get; set; }
            public string? SenderEmail    { get; set; }
            public string? SenderName     { get; set; }
            public string? SmtpUsername   { get; set; }
            public string? SmtpPassword   { get; set; }
            public string? SmtpServer     { get; set; }
            public int?    SmtpPort       { get; set; }
            public string? SmtpEncryption { get; set; }
            public bool?   IsActive       { get; set; }
        }

        public class TemplateRequest
        {
            public string? Name    { get; set; }
            public string? Subject { get; set; }
            public string? Body    { get; set; }
            public bool    IsHtml  { get; set; } = true;
        }

        public class AdminUserStatusRequest
        {
            public bool IsActive { get; set; }
        }

        public class AdminUserRoleRequest
        {
            public string Role { get; set; } = "user";
        }

        public class AdminCreateServiceRequest
        {
            public int?    UserId        { get; set; }
            public string  Name          { get; set; } = string.Empty;
            public string  SenderEmail   { get; set; } = string.Empty;
            public string? SenderName    { get; set; }
            public string? SmtpUsername  { get; set; }
            public string? SmtpPassword  { get; set; }
            public string? SmtpServer    { get; set; }
            public int?    SmtpPort      { get; set; }
            public string? SmtpEncryption { get; set; }
            public string? Description   { get; set; }
        }
    }
}
