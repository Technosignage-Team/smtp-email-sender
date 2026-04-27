using System.Net;
using System.Net.Mail;

namespace EmailApi.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string subject, string body);
        Task SendEmailToMultipleAsync(string subject, string body, List<string> recipients);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string subject, string body)
        {
            var smtpHost = _config["SmtpConfig:Host"];
            var smtpPort = int.Parse(_config["SmtpConfig:Port"] ?? "587");
            var username = _config["SmtpConfig:Username"];
            var password = _config["SmtpConfig:Password"];
            var fromEmail = _config["SmtpConfig:FromEmail"];
            var toEmail = _config["SmtpConfig:ToEmail"];
            var enableSsl = bool.Parse(_config["SmtpConfig:EnableSsl"] ?? "true");

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = enableSsl
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail!),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mailMessage.To.Add(toEmail!);

            await client.SendMailAsync(mailMessage);
        }

        public async Task SendEmailToMultipleAsync(string subject, string body, List<string> recipients)
        {
            var smtpHost = _config["SmtpConfig:Host"];
            var smtpPort = int.Parse(_config["SmtpConfig:Port"] ?? "587");
            var username = _config["SmtpConfig:Username"];
            var password = _config["SmtpConfig:Password"];
            var fromEmail = _config["SmtpConfig:FromEmail"];
            var enableSsl = bool.Parse(_config["SmtpConfig:EnableSsl"] ?? "true");

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = enableSsl
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail!),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            foreach (var recipient in recipients)
            {
                mailMessage.To.Add(recipient);
            }

            await client.SendMailAsync(mailMessage);
        }
    }
}
