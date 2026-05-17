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
                UserId       = userId,
                AppName      = req.Name.Trim(),
                SenderEmail  = req.SenderEmail.Trim(),
                SenderName   = req.SenderName?.Trim(),
                SmtpUsername = req.SmtpUsername?.Trim(),
                SmtpPassword = req.SmtpPassword,
                Description  = req.Description?.Trim(),
                AppKey       = GenerateApiKey(),
                IsActive     = true,
            };

            _db.Apps.Add(app);
            try
            {
                await _db.SaveChangesAsync();
            }
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

            if (req.Name        != null) app.AppName      = req.Name.Trim();
            if (req.SenderEmail != null) app.SenderEmail  = req.SenderEmail.Trim();
            if (req.SenderName  != null) app.SenderName   = req.SenderName.Trim();
            if (req.SmtpUsername!= null) app.SmtpUsername = req.SmtpUsername.Trim();
            if (req.SmtpPassword!= null) app.SmtpPassword = req.SmtpPassword;
            if (req.IsActive.HasValue)   app.IsActive     = req.IsActive.Value;
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

        private static object ToUserDto(UserEntity u) => new
        {
            u.Id, u.Username, u.Email, u.CreatedAt
        };

        private static object ToServiceDto(AppEntity a) => new
        {
            a.Id,
            name         = a.AppName,
            apiKey       = a.AppKey,
            senderEmail  = a.SenderEmail,
            senderName   = a.SenderName,
            smtpUsername = a.SmtpUsername,
            hasSmtpPassword = !string.IsNullOrEmpty(a.SmtpPassword),
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
            public string  Name         { get; set; } = string.Empty;
            public string  SenderEmail  { get; set; } = string.Empty;
            public string? SenderName   { get; set; }
            public string? SmtpUsername { get; set; }
            public string? SmtpPassword { get; set; }
            public string? Description  { get; set; }
        }

        public class UpdateServiceRequest
        {
            public string? Name         { get; set; }
            public string? SenderEmail  { get; set; }
            public string? SenderName   { get; set; }
            public string? SmtpUsername { get; set; }
            public string? SmtpPassword { get; set; }
            public bool?   IsActive     { get; set; }
        }

        public class TemplateRequest
        {
            public string? Name    { get; set; }
            public string? Subject { get; set; }
            public string? Body    { get; set; }
            public bool    IsHtml  { get; set; } = true;
        }
    }
}
