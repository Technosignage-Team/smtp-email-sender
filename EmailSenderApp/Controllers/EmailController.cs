using Microsoft.AspNetCore.Mvc;
using EmailApi.Models;
using EmailApi.Services;

namespace EmailApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailController : ControllerBase
    {
        private readonly IEmailService _emailService;

        public EmailController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendEmail([FromBody] EmailRequest request)
        {
            if (string.IsNullOrEmpty(request.Subject) || string.IsNullOrEmpty(request.Body))
            {
                return BadRequest("Subject and Body are required.");
            }

            try
            {
                await _emailService.SendEmailAsync(request.Subject, request.Body);
                return Ok(new { message = "Email sent successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("send-bulk")]
        public async Task<IActionResult> SendBulkEmail([FromBody] BulkEmailRequest request)
        {
            if (string.IsNullOrEmpty(request.Subject) || string.IsNullOrEmpty(request.Body))
            {
                return BadRequest("Subject and Body are required.");
            }

            if (request.Recipients == null || !request.Recipients.Any())
            {
                return BadRequest("At least one recipient is required.");
            }

            try
            {
                await _emailService.SendEmailToMultipleAsync(request.Subject, request.Body, request.Recipients);
                return Ok(new { message = "Email sent successfully", recipientCount = request.Recipients.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
