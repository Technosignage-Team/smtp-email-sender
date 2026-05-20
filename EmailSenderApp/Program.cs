using EmailApi.Data;
using EmailApi.Services;
using Microsoft.EntityFrameworkCore;

// Prevent unobserved task exceptions from crashing the process.
TaskScheduler.UnobservedTaskException += (_, e) =>
{
    Console.Error.WriteLine($"[UnobservedTaskException] {e.Exception}");
    e.SetObserved();
};

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
builder.Services.AddDbContext<EmailSenderDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("EmailSender")));

// Register Email Service
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ITokenService, TokenService>();

// HttpClient for outbound calls (Gemini API)
builder.Services.AddHttpClient();

// Configure CORS for the frontend.
// Allowed origins are loaded from appsettings.json ("Cors:AllowedOrigins").
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        if (allowedOrigins.Length == 0)
        {
            // Fallback for local dev only.
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });

    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use the configured policy (lists exact origins); falls back to AllowAny only when
// no origins are configured (local dev without appsettings overrides).
app.UseCors(allowedOrigins.Length > 0 ? "FrontendPolicy" : "AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
