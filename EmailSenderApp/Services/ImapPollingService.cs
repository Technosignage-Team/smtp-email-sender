using EmailApi.Data;
using Microsoft.EntityFrameworkCore;

namespace EmailApi.Services
{
    /// <summary>
    /// Background worker that polls IMAP mailboxes for all active services with ImapEnabled=true.
    /// </summary>
    public class ImapPollingService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly IConfiguration       _config;
        private readonly ILogger<ImapPollingService> _log;

        public ImapPollingService(
            IServiceScopeFactory scopes,
            IConfiguration config,
            ILogger<ImapPollingService> log)
        {
            _scopes = scopes;
            _config = config;
            _log    = log;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var enabled = _config.GetValue("ImapPolling:Enabled", true);
            if (!enabled)
            {
                _log.LogInformation("IMAP polling is disabled via configuration.");
                return;
            }

            var intervalSec = Math.Max(15, _config.GetValue("ImapPolling:IntervalSeconds", 30));
            _log.LogInformation("IMAP polling started — interval {Interval}s", intervalSec);

            // Small startup delay so the app finishes booting first
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try { await PollAllAsync(stoppingToken); }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _log.LogError(ex, "Unexpected error in IMAP polling loop");
                }

                await Task.Delay(TimeSpan.FromSeconds(intervalSec), stoppingToken);
            }
        }

        private async Task PollAllAsync(CancellationToken ct)
        {
            using var scope = _scopes.CreateScope();
            var db      = scope.ServiceProvider.GetRequiredService<EmailSenderDbContext>();
            var imap    = scope.ServiceProvider.GetRequiredService<IImapMailboxService>();
            var webhooks = scope.ServiceProvider.GetRequiredService<IWebhookDeliveryService>();

            var apps = await db.Apps
                .Where(a => a.IsActive && a.ImapEnabled)
                .ToListAsync(ct);

            if (apps.Count == 0) return;

            _log.LogDebug("Polling {Count} IMAP-enabled service(s)", apps.Count);

            foreach (var app in apps)
            {
                ct.ThrowIfCancellationRequested();

                var newIds = await imap.PollAppMailboxAsync(app, ct);
                foreach (var id in newIds)
                {
                    try { await webhooks.DispatchEmailReceivedAsync(id, ct); }
                    catch (Exception ex)
                    {
                        _log.LogWarning(ex, "Webhook dispatch failed for incoming email {Id}", id);
                    }
                }

                if (newIds.Count > 0)
                    _log.LogInformation("App {AppName}: {Count} new email(s) received", app.AppName, newIds.Count);
            }
        }
    }
}
