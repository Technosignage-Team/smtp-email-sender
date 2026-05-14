# Prompt — Integrate EmailSender API into a New App

Copy this prompt into the new app's Copilot / AI assistant to wire up email sending.

---

## Prompt

> I need to integrate an external centralized email API into this app.
> Below are the full details. Implement everything needed so the app can send emails through this service.

### API Details

| Key | Value |
|---|---|
| **Single email endpoint** | `https://EmailSender-api.technosignage.com/api/email/send` |
| **Bulk endpoint** (one email per recipient) | `https://EmailSender-api.technosignage.com/api/email/send-bulk` |
| **API key header** | `X-Api-Key: esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I` |
| **Protocol** | HTTPS |
| **Content-Type** | `multipart/form-data` |

### Request Fields (form-data)

| Field | Required | Description |
|---|---|---|
| `Subject` | yes | Plain-text email subject |
| `Body` | yes | HTML or plain-text email body |
| `IsHtml` | no | `true` (default) or `false` |
| `Recipients` | yes | Comma-separated emails, e.g. `a@x.com,b@y.com` |
| `Attachments` | no | Repeat the field for multiple files |

### Response

| Status | Meaning |
|---|---|
| `200 OK` | `{ "success": true, "message": "...", "to": "..." }` |
| `400` | Bad request (missing/invalid fields) |
| `401` | Missing or invalid `X-Api-Key` |
| `403` | App is deactivated |
| `500` | SMTP failure (still logged on their side) |

---

## What to implement

1. **Store config values** — never hard-code the API key in source code. Use environment variables, `appsettings.json`, or a secrets manager.

2. **Create an email service/client** that:
   - Accepts `recipients`, `subject`, `htmlBody`, and an optional `bulk` flag.
   - Posts a `multipart/form-data` request with the `X-Api-Key` header.
   - Calls `/api/email/send` for a single email and `/api/email/send-bulk` when `bulk = true`.
   - Throws/rejects on non-2xx responses (log status + body for debugging).

3. **HTML-encode** any user-supplied values inserted into the email body to prevent HTML injection.

4. **Call the service asynchronously** — do not block the user's request on email delivery. Fire after the main operation (e.g., DB save) completes, or push to a background queue.

5. **Retry on transient errors** (`5xx`, timeouts) with exponential backoff. Do **not** retry on `400 / 401 / 403`.

---

## Config snippet to add

### Node.js / `.env`
```
EMAIL_API_BASE=https://EmailSender-api.technosignage.com
EMAIL_API_KEY=esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I
EMAIL_ADMIN_RECIPIENTS=admin1@yourcompany.com,admin2@yourcompany.com
```

### .NET / `appsettings.json`
```json
"EmailSender": {
  "BaseUrl": "https://EmailSender-api.technosignage.com",
  "ApiKey": "esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I",
  "AdminRecipients": [ "admin1@yourcompany.com", "admin2@yourcompany.com" ]
}
```

---

## Minimal usage examples

### Node.js (fetch)
```js
const BASE   = process.env.EMAIL_API_BASE;
const APIKEY = process.env.EMAIL_API_KEY;

async function sendEmail({ recipients, subject, html, bulk = false }) {
  const fd = new FormData();
  fd.append("Subject", subject);
  fd.append("Body", html);
  fd.append("IsHtml", "true");
  fd.append("Recipients", recipients.join(","));

  const endpoint = bulk ? "/api/email/send-bulk" : "/api/email/send";
  const res = await fetch(BASE + endpoint, {
    method: "POST",
    headers: { "X-Api-Key": APIKEY },
    body: fd,
  });
  if (!res.ok) throw new Error(`EmailSender ${res.status}: ${await res.text()}`);
}
```

### C# (.NET)
```csharp
public async Task SendAsync(
    IEnumerable<string> recipients, string subject, string htmlBody,
    bool bulk = false, CancellationToken ct = default)
{
    using var form = new MultipartFormDataContent
    {
        { new StringContent(subject),                   "Subject"    },
        { new StringContent(htmlBody),                  "Body"       },
        { new StringContent("true"),                    "IsHtml"     },
        { new StringContent(string.Join(",", recipients)), "Recipients" },
    };

    var path = bulk ? "/api/email/send-bulk" : "/api/email/send";
    using var req = new HttpRequestMessage(HttpMethod.Post, path) { Content = form };
    req.Headers.Add("X-Api-Key", _apiKey);

    using var res = await _http.SendAsync(req, ct);
    if (!res.IsSuccessStatusCode)
        throw new InvalidOperationException(
            $"EmailSender {(int)res.StatusCode}: {await res.Content.ReadAsStringAsync(ct)}");
}
```

---

## Quick smoke-test (curl)
```bash
curl -X POST https://EmailSender-api.technosignage.com/api/email/send \
  -H "X-Api-Key: esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I" \
  -F "Subject=Smoke test" \
  -F "Body=<p>Hello from new app</p>" \
  -F "IsHtml=true" \
  -F "Recipients=you@yourdomain.com"
```
Expected: `{"success":true, ...}`

---

## Rules checklist
- [ ] API key is read from config/env, not hard-coded
- [ ] User input is HTML-encoded before insertion into `Body`
- [ ] Email is sent **after** the main operation (non-blocking)
- [ ] Non-2xx responses are logged with status code + body
- [ ] `/send-bulk` is used when notifying multiple recipients privately
