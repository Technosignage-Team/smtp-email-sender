using System.Reflection;
using EmailApi.Data;
using EmailApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

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
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Email Sender API",
        Version = "v1",
        Description = "Public API for sending emails. Authenticate via the X-Api-Key header with your registered app key."
    });

    // Security scheme for X-Api-Key header
    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Name = "X-Api-Key",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Description = "Enter your app's API key to authenticate.",
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                }
            },
            Array.Empty<string>()
        }
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
});

// Database
builder.Services.AddDbContext<EmailSenderDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("EmailSender")));

// Register Email Service
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IImapMailboxService, ImapMailboxService>();
builder.Services.AddScoped<IWebhookDeliveryService, WebhookDeliveryService>();

// IMAP background polling
builder.Services.AddHostedService<ImapPollingService>();

// HttpClient for outbound calls (webhooks)
builder.Services.AddHttpClient("webhooks");

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
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Email Sender API v1");
    c.RoutePrefix = "swagger";
});

// Use the configured policy (lists exact origins); falls back to AllowAny only when
// no origins are configured (local dev without appsettings overrides).
app.UseCors(allowedOrigins.Length > 0 ? "FrontendPolicy" : "AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
