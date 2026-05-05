# EmailSender API — Integration Guide

> Paste this file into the consumer app's repo (e.g. `docs/EMAIL_SENDER_INTEGRATION.md`)
> and hand it to that app's Copilot / developer.

## What this service does
We have a centralized email-sending HTTP API. Any app can send an email by POSTing
a `multipart/form-data` request with an API key. Every call is logged on our side.

## Credentials (provided by the EmailSender admin)
- **Endpoint:** `http://EmailSender-api.technosignage.com/api/email/send`
- **Bulk endpoint (one separate email per recipient):** `http://EmailSender-api.technosignage.com/api/email/send-bulk`
- **API Key (header `X-Api-Key`):** `esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I`
- **Protocol:** plain HTTP (no HTTPS).

## Request contract

| Where | Name | Required | Notes |
|---|---|---|---|
| Header | `X-Api-Key` | yes | The key above. |
| Body (form-data) | `Subject` | yes | Plain text. |
| Body (form-data) | `Body` | yes | HTML or plain text. |
| Body (form-data) | `IsHtml` | no | `true` (default) or `false`. |
| Body (form-data) | `Recipients` | yes for our use | Comma-separated email list, e.g. `a@x.com,b@y.com`. |
| Body (form-data) | `Attachments` | no | One or more files. Repeat the field name to attach multiple. |

**Content-Type:** must be `multipart/form-data` (the HTTP client will set this automatically — do not hand-roll it).

## Response contract
- `200 OK` → JSON `{ "success": true, "message": "...", "to": "..." }`
- `400` → invalid request (missing subject/body, invalid email).
- `401` → missing/invalid `X-Api-Key`.
- `403` → app is deactivated.
- `500` → SMTP failure (we still log it).

---

## Use case 1 — Confirmation email to the vendor

Call `/api/email/send` with:
- `Recipients` = the vendor's single email
- `Subject` = `"Your registration request has been received"`
- `Body` = HTML message including their reference / status (e.g. `Pending`)

## Use case 2 — Notification to all admins

Two valid options:

- **Option A (simplest — single email, multiple `To`):** call `/api/email/send` with
  `Recipients = "admin1@...,admin2@...,admin3@..."`. All admins are in the same `To:` line.
- **Option B (recommended for privacy — one email per admin):** call `/api/email/send-bulk`
  with the same comma-separated `Recipients`. The service sends one separate email per
  address (no admin sees the others).

---

## Reference implementation — C# (.NET 6/7/8)

Add this service to your DI container and call it from your registration handler.

```csharp
using System.Net.Http.Headers;

public interface IEmailSenderClient
{
    Task SendAsync(
        IEnumerable<string> recipients,
        string subject,
        string htmlBody,
        bool bulk = false,
        IEnumerable<(string fileName, byte[] content, string contentType)>? attachments = null,
        CancellationToken ct = default);
}

public sealed class EmailSenderClient : IEmailSenderClient
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    public EmailSenderClient(HttpClient http, IConfiguration config)
    {
        _http = http;
        _http.BaseAddress = new Uri(config["EmailSender:BaseUrl"]!); // http://EmailSender-api.technosignage.com
        _apiKey = config["EmailSender:ApiKey"]!;                      // esk_...
    }

    public async Task SendAsync(
        IEnumerable<string> recipients,
        string subject,
        string htmlBody,
        bool bulk = false,
        IEnumerable<(string fileName, byte[] content, string contentType)>? attachments = null,
        CancellationToken ct = default)
    {
        using var form = new MultipartFormDataContent
        {
            { new StringContent(subject), "Subject" },
            { new StringContent(htmlBody), "Body" },
            { new StringContent("true"), "IsHtml" },
            { new StringContent(string.Join(",", recipients)), "Recipients" },
        };

        if (attachments is not null)
        {
            foreach (var (name, bytes, mime) in attachments)
            {
                var file = new ByteArrayContent(bytes);
                file.Headers.ContentType = new MediaTypeHeaderValue(mime);
                form.Add(file, "Attachments", name);
            }
        }

        var path = bulk ? "/api/email/send-bulk" : "/api/email/send";
        using var req = new HttpRequestMessage(HttpMethod.Post, path) { Content = form };
        req.Headers.Add("X-Api-Key", _apiKey);

        using var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                $"EmailSender returned {(int)res.StatusCode}: {body}");
        }
    }
}
```

Register it once in `Program.cs`:

```csharp
builder.Services.AddHttpClient<IEmailSenderClient, EmailSenderClient>();
```

In `appsettings.json`:

```json
"EmailSender": {
  "BaseUrl": "http://EmailSender-api.technosignage.com",
  "ApiKey": "esk_REPLACE_WITH_KEY_GIVEN_TO_YOU",
  "AdminRecipients": [ "admin1@yourcompany.com", "admin2@yourcompany.com" ]
}
```

Then in the vendor registration handler:

```csharp
public async Task HandleVendorRegisteredAsync(Vendor vendor, CancellationToken ct)
{
    // 1) Confirmation to the vendor
    var vendorBody = $@"
        <p>Hi {System.Net.WebUtility.HtmlEncode(vendor.ContactName)},</p>
        <p>We received your registration request for <strong>{System.Net.WebUtility.HtmlEncode(vendor.CompanyName)}</strong>.</p>
        <p>Status: <strong>Pending review</strong>. We'll email you once it has been approved.</p>
        <p>Reference: <code>{vendor.Id}</code></p>";

    await _email.SendAsync(
        recipients: new[] { vendor.Email },
        subject:    "Your registration request has been received",
        htmlBody:   vendorBody,
        ct: ct);

    // 2) Notification to admins (one email each, BCC-style)
    var admins = _config.GetSection("EmailSender:AdminRecipients").Get<string[]>()!;
    var adminBody = $@"
        <p>A new vendor registration has been submitted.</p>
        <ul>
          <li><strong>Company:</strong> {System.Net.WebUtility.HtmlEncode(vendor.CompanyName)}</li>
          <li><strong>Contact:</strong> {System.Net.WebUtility.HtmlEncode(vendor.ContactName)} &lt;{vendor.Email}&gt;</li>
          <li><strong>Reference:</strong> {vendor.Id}</li>
        </ul>
        <p>Please review it in the admin portal.</p>";

    await _email.SendAsync(
        recipients: admins,
        subject:    $"New vendor registration: {vendor.CompanyName}",
        htmlBody:   adminBody,
        bulk:       true,   // one separate email per admin
        ct: ct);
}
```

> **Don't block the user's HTTP request on email sending.** Either `await` it after
> the DB commit (acceptable if it's fast), or push the call to a background queue /
> `IHostedService` / Hangfire job and return the response to the user immediately.

---

## Reference implementation — Node.js (fetch + form-data)

```js
import FormData from "form-data";

const BASE   = "http://EmailSender-api.technosignage.com";
const APIKEY = "esk_REPLACE_WITH_KEY_GIVEN_TO_YOU";

async function sendEmail({ recipients, subject, html, bulk = false, attachments = [] }) {
  const fd = new FormData();
  fd.append("Subject", subject);
  fd.append("Body", html);
  fd.append("IsHtml", "true");
  fd.append("Recipients", recipients.join(","));
  for (const a of attachments) fd.append("Attachments", a.buffer, a.filename);

  const path = bulk ? "/api/email/send-bulk" : "/api/email/send";
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "X-Api-Key": APIKEY, ...fd.getHeaders() },
    body: fd,
  });
  if (!res.ok) throw new Error(`EmailSender ${res.status}: ${await res.text()}`);
}

// On vendor registration:
await sendEmail({
  recipients: [vendor.email],
  subject:    "Your registration request has been received",
  html:       `<p>Hi ${escapeHtml(vendor.name)}, we received your request. Status: <b>Pending</b>.</p>`,
});

await sendEmail({
  recipients: ["admin1@yourcompany.com", "admin2@yourcompany.com"],
  subject:    `New vendor registration: ${vendor.companyName}`,
  html:       `<p>${escapeHtml(vendor.companyName)} just registered.</p>`,
  bulk:       true,
});
```

---

## Sanity-test with curl before integrating

```bash
curl -X POST http://EmailSender-api.technosignage.com/api/email/send \
  -H "X-Api-Key: esk_REPLACE_WITH_KEY_GIVEN_TO_YOU" \
  -F "Subject=Smoke test" \
  -F "Body=<p>Hello</p>" \
  -F "IsHtml=true" \
  -F "Recipients=you@yourdomain.com"
```

Expected: `{"success":true, ...}`. If you get `401`, the key is wrong or missing.
If `403`, the app is disabled — contact the EmailSender admin.

---

## Rules / good practices
1. **Never hard-code the API key in source.** Read it from configuration / environment variables / secrets manager.
2. **HTML-encode user-supplied values** before putting them into the `Body` to avoid HTML injection.
3. **Send asynchronously** from the registration flow; do not let email failure block registration.
4. **Retry on transient failure** (timeout, `5xx`) with exponential backoff (e.g. Polly in .NET). Do **not** retry on `400` / `401` / `403`.
5. **Log the response** (status + body) so failures are diagnosable.
6. **Use `/send-bulk`** when emailing multiple admins so they don't see each other's addresses.
