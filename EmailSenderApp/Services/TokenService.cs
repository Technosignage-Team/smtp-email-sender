using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EmailApi.Models;
using Microsoft.IdentityModel.Tokens;

namespace EmailApi.Services
{
    // ── Password hashing (PBKDF2 / SHA-256, no extra packages needed) ─────────

    public static class PasswordHelper
    {
        private const int Iterations = 100_000;
        private const int SaltSize   = 16;
        private const int HashSize   = 32;

        public static string Hash(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
            return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
        }

        public static bool Verify(string password, string storedHash)
        {
            var parts = storedHash.Split(':');
            if (parts.Length != 2) return false;
            var salt     = Convert.FromBase64String(parts[0]);
            var expected = Convert.FromBase64String(parts[1]);
            var actual   = Rfc2898DeriveBytes.Pbkdf2(
                password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
    }

    // ── JWT token service ──────────────────────────────────────────────────────

    public interface ITokenService
    {
        string GenerateToken(UserEntity user);
        ClaimsPrincipal? Validate(string token);
    }

    public class TokenService : ITokenService
    {
        private const string Issuer   = "EmailSenderApi";
        private const string Audience = "EmailSenderClient";

        private readonly string _secret;
        private readonly int    _expiryDays;

        public TokenService(IConfiguration config)
        {
            _secret     = config["Jwt:Secret"]
                          ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
            _expiryDays = int.TryParse(config["Jwt:ExpiryDays"], out var d) ? d : 30;
        }

        public string GenerateToken(UserEntity user)
        {
            var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub,         user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName,  user.Username),
                new Claim(JwtRegisteredClaimNames.Jti,         Guid.NewGuid().ToString()),
            };

            var token = new JwtSecurityToken(
                issuer:             Issuer,
                audience:           Audience,
                claims:             claims,
                expires:            DateTime.UtcNow.AddDays(_expiryDays),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public ClaimsPrincipal? Validate(string token)
        {
            try
            {
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
                return new JwtSecurityTokenHandler().ValidateToken(token,
                    new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey         = key,
                        ValidateIssuer           = true,
                        ValidIssuer              = Issuer,
                        ValidateAudience         = true,
                        ValidAudience            = Audience,
                        ValidateLifetime         = true,
                        ClockSkew                = TimeSpan.Zero,
                    }, out _);
            }
            catch { return null; }
        }
    }
}
