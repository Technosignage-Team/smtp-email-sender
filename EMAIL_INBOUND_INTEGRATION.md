# EmailSender Inbound API — Integration Guide

> Paste this file into the consumer app's repo (e.g. `docs/EMAIL_INBOUND_INTEGRATION.md`)
> and hand it to that app's Copilot / developer.

## What this service does

EmailSender polls your service's mailbox over **IMAP** (configured by the EmailSender admin),
stores incoming messages, and exposes them to external apps in two ways:

1. **Webhooks (push)** — EmailSender POSTs to your URL when a new email arrives.
2. **REST API (pull)** — Your app polls `/api/inbound/*` with the same service API key used for sending.

Each service only sees emails received for **its own mailbox** (scoped by `X-Api-Key`).

---

## Prerequisites (EmailSender admin)

Before integrating, confirm with the EmailSender admin that:

1. SQL migration `03_inbound_emails.sql` has been run on the EmailSender database.
2. Your service has **IMAP listening enabled** in Account → My Services → Edit Service.
3. IMAP is enabled in the mailbox provider (e.g. Zoho Mail settings).
4. For **webhooks**: a webhook URL is registered in Account → My Services → **Webhooks**.
5. The backend is deployed with IMAP polling enabled (`ImapPolling:Enabled = true`).

---

## Credentials (provided by the EmailSender admin)

| Key | Value |
|---|---|
| **Base URL** | `https://EmailSender-api.technosignage.com` |
| **API Key (header `X-Api-Key`)** | `esk_REPLACE_WITH_KEY_GIVEN_TO_YOU` |
| **Protocol** | HTTPS |
| **Auth** | Same service key used for `/api/email/send` |

> **Local dev:** use `http://localhost:5050` as the base URL instead.

---

## Integration modes

| Mode | When to use | Your app needs |
|---|---|---|
| **Webhooks** | Real-time reactions (tickets, notifications, workflows) | Public HTTPS endpoint |
| **REST polling** | Batch jobs, simple integrations, fetching full body after webhook | Outbound HTTPS only |

You can use **both**: webhook for instant alert, then `GET /api/inbound/emails/{id}` for full body.

---

## REST API — endpoints

All endpoints require header:

```http
X-Api-Key: esk_REPLACE_WITH_KEY_GIVEN_TO_YOU
```

### GET `/api/inbound/unread-count`

Quick poll helper — check if new mail exists before listing.

**Response `200 OK`:**

```json
{
  "success": true,
  "unreadCount": 3,
  "appName": "My Service"
}
```

---

### GET `/api/inbound/emails`

List received emails for this service (newest first).

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `skip` | int | `0` | Pagination offset |
| `take` | int | `50` | Page size (max 200) |
| `isRead` | bool | — | `true` = read only, `false` = unread only |
| `from` | datetime | — | Filter `ReceivedAt >= from` (ISO 8601) |
| `to` | datetime | — | Filter `ReceivedAt <= to` (ISO 8601) |

**Response `200 OK`:**

```json
{
  "success": true,
  "total": 27,
  "appName": "My Service",
  "rows": [
    {
      "id": 27,
      "from": "sender@example.com",
      "fromName": "Jane Sender",
      "to": "info@yourdomain.com",
      "subject": "Hello",
      "bodyPreview": "First 2000 chars of plain text…",
      "hasAttachments": false,
      "attachmentCount": 0,
      "isRead": false,
      "receivedAt": "2026-06-15T10:51:31"
    }
  ]
}
```

---

### GET `/api/inbound/emails/{id}`

Full email details including `bodyText` and `bodyHtml`.

**Response `200 OK`:**

```json
{
  "success": true,
  "email": {
    "id": 27,
    "appId": 13,
    "appName": "My Service",
    "from": "sender@example.com",
    "fromName": "Jane Sender",
    "to": "info@yourdomain.com",
    "subject": "Hello",
    "bodyPreview": "…",
    "bodyText": "Plain text body",
    "bodyHtml": "<p>HTML body</p>",
    "hasAttachments": false,
    "attachmentCount": 0,
    "isRead": false,
    "receivedAt": "2026-06-15T10:51:31",
    "messageId": "<abc@mail.gmail.com>"
  }
}
```

**Response `404`:** email not found or belongs to another service.

---

### PATCH `/api/inbound/emails/{id}/read`

Mark an email read/unread **in EmailSender's database** (does not change read state in Zoho/Gmail).

**Request body (JSON, optional):**

```json
{ "isRead": true }
```

**Response `200 OK`:**

```json
{ "success": true, "id": 27, "isRead": true }
```

---

## REST API — error responses

| Status | Meaning |
|---|---|
| `200 OK` | Success |
| `401` | Missing or invalid `X-Api-Key` |
| `404` | Email ID not found for this service |
| `500` | Server error |

---

## Webhooks — push notifications

Register your webhook URL in the EmailSender dashboard:
**Account → My Services → [your service] → Webhooks**.

When a new email is stored, EmailSender POSTs to every **active** webhook for that service.

### Outgoing request

```http
POST https://your-app.com/webhooks/email-received
Content-Type: application/json
X-Webhook-Event: email.received
X-Webhook-Signature: sha256=<hmac-hex>
User-Agent: EmailSender-Webhook/1.0
```

**Body:**

```json
{
  "event": "email.received",
  "timestamp": "2026-06-15T11:00:00Z",
  "data": {
    "id": 27,
    "appId": 13,
    "appName": "My Service",
    "from": "sender@example.com",
    "fromName": "Jane Sender",
    "to": "info@yourdomain.com",
    "subject": "Hello",
    "bodyPreview": "First 2000 chars…",
    "hasAttachments": false,
    "attachmentCount": 0,
    "receivedAt": "2026-06-15T10:51:31"
  }
}
```

> Webhook payload includes a **preview only**. Call `GET /api/inbound/emails/{id}` for full body.

### Signature verification

The `X-Webhook-Signature` header is:

```
sha256=<lowercase-hex-of-hmac-sha256(raw-json-body, webhook-secret)>
```

- Compute HMAC-SHA256 over the **raw request body bytes** (before JSON parsing).
- Use the **webhook secret** shown when the webhook was created in the dashboard (`whsec_…`).
- Reject the request if signatures do not match.

**Important:** Read the raw body stream once, verify signature, then deserialize JSON.

---

## Use case 1 — Poll for new emails (simple)

1. `GET /api/inbound/unread-count`
2. If `unreadCount > 0`, `GET /api/inbound/emails?isRead=false`
3. For each row, `GET /api/inbound/emails/{id}` if you need full HTML/text
4. Process the email in your app
5. `PATCH /api/inbound/emails/{id}/read` with `{ "isRead": true }`

Run steps 1–5 on a timer (e.g. every 1–5 minutes) or after user action.

---

## Use case 2 — Webhook + fetch full body (recommended)

1. Expose `POST /webhooks/email-received` on your app
2. Verify `X-Webhook-Signature` using your webhook secret
3. Parse `data.id` from the JSON body
4. `GET /api/inbound/emails/{id}` with `X-Api-Key` to load full content
5. Process and mark read via `PATCH /api/inbound/emails/{id}/read`

---

## Reference implementation — C# (.NET 6/7/8)

### Pull client

```csharp
using System.Net.Http.Json;
using System.Text.Json.Serialization;

public interface IEmailInboundClient
{
    Task<int> GetUnreadCountAsync(CancellationToken ct = default);
    Task<InboundListResponse> ListEmailsAsync(bool? isRead = null, int skip = 0, int take = 50, CancellationToken ct = default);
    Task<InboundEmailDetail> GetEmailAsync(long id, CancellationToken ct = default);
    Task MarkReadAsync(long id, bool isRead = true, CancellationToken ct = default);
}

public sealed class EmailInboundClient : IEmailInboundClient
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    public EmailInboundClient(HttpClient http, IConfiguration config)
    {
        _http = http;
        _http.BaseAddress = new Uri(config["EmailSender:BaseUrl"]!);
        _apiKey = config["EmailSender:ApiKey"]!;
    }

    private HttpRequestMessage Create(string path, HttpMethod? method = null)
    {
        var req = new HttpRequestMessage(method ?? HttpMethod.Get, path);
        req.Headers.Add("X-Api-Key", _apiKey);
        return req;
    }

    public async Task<int> GetUnreadCountAsync(CancellationToken ct = default)
    {
        using var req = Create("/api/inbound/unread-count");
        using var res = await _http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        var data = await res.Content.ReadFromJsonAsync<UnreadCountResponse>(cancellationToken: ct);
        return data!.UnreadCount;
    }

    public async Task<InboundListResponse> ListEmailsAsync(bool? isRead = null, int skip = 0, int take = 50, CancellationToken ct = default)
    {
        var qs = $"?skip={skip}&take={take}" + (isRead.HasValue ? $"&isRead={isRead.Value.ToString().ToLowerInvariant()}" : "");
        using var req = Create("/api/inbound/emails" + qs);
        using var res = await _http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<InboundListResponse>(cancellationToken: ct))!;
    }

    public async Task<InboundEmailDetail> GetEmailAsync(long id, CancellationToken ct = default)
    {
        using var req = Create($"/api/inbound/emails/{id}");
        using var res = await _http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        var wrapper = await res.Content.ReadFromJsonAsync<EmailDetailResponse>(cancellationToken: ct);
        return wrapper!.Email;
    }

    public async Task MarkReadAsync(long id, bool isRead = true, CancellationToken ct = default)
    {
        using var req = Create($"/api/inbound/emails/{id}/read", HttpMethod.Patch);
        req.Content = JsonContent.Create(new { isRead });
        using var res = await _http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
    }
}

public record UnreadCountResponse([property: JsonPropertyName("unreadCount")] int UnreadCount);
public record InboundListResponse(int Total, List<InboundEmailSummary> Rows);
public record InboundEmailSummary(long Id, string From, string Subject, string BodyPreview, bool IsRead, DateTime ReceivedAt);
public record EmailDetailResponse(InboundEmailDetail Email);
public record InboundEmailDetail(long Id, string From, string Subject, string? BodyText, string? BodyHtml, bool IsRead, DateTime ReceivedAt);
```

Register in `Program.cs`:

```csharp
builder.Services.AddHttpClient<IEmailInboundClient, EmailInboundClient>();
```

### Webhook receiver + signature verification

```csharp
using System.Security.Cryptography;
using System.Text;

app.MapPost("/webhooks/email-received", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body, Encoding.UTF8);
    var rawBody = await reader.ReadToEndAsync();

    var signature = request.Headers["X-Webhook-Signature"].ToString();
    var secret = config["EmailSender:WebhookSecret"]!; // whsec_… from dashboard

    if (!VerifyWebhookSignature(rawBody, secret, signature))
        return Results.Unauthorized();

    var payload = JsonSerializer.Deserialize<WebhookPayload>(rawBody);
    if (payload?.Event != "email.received" || payload.Data?.Id is null)
        return Results.BadRequest();

    var email = await inboundClient.GetEmailAsync(payload.Data.Id);
    // …process email…
    await inboundClient.MarkReadAsync(payload.Data.Id);

    return Results.Ok();
});

static bool VerifyWebhookSignature(string rawBody, string secret, string header)
{
    var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(rawBody));
    var expected = "sha256=" + Convert.ToHexString(hash).ToLowerInvariant();
    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(expected),
        Encoding.UTF8.GetBytes(header));
}
```

`appsettings.json`:

```json
"EmailSender": {
  "BaseUrl": "https://EmailSender-api.technosignage.com",
  "ApiKey": "esk_REPLACE_WITH_KEY_GIVEN_TO_YOU",
  "WebhookSecret": "whsec_REPLACE_WITH_SECRET_FROM_DASHBOARD"
}
```

---

## Reference implementation — Node.js (fetch)

### Pull client

```js
const BASE   = "https://EmailSender-api.technosignage.com";
const APIKEY = "esk_REPLACE_WITH_KEY_GIVEN_TO_YOU";

const headers = { "X-Api-Key": APIKEY };

async function getUnreadCount() {
  const res = await fetch(`${BASE}/api/inbound/unread-count`, { headers });
  if (!res.ok) throw new Error(`EmailSender ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.unreadCount;
}

async function listUnreadEmails(take = 50) {
  const res = await fetch(`${BASE}/api/inbound/emails?isRead=false&take=${take}`, { headers });
  if (!res.ok) throw new Error(`EmailSender ${res.status}: ${await res.text()}`);
  return (await res.json()).rows;
}

async function getEmail(id) {
  const res = await fetch(`${BASE}/api/inbound/emails/${id}`, { headers });
  if (!res.ok) throw new Error(`EmailSender ${res.status}: ${await res.text()}`);
  return (await res.json()).email;
}

async function markRead(id, isRead = true) {
  const res = await fetch(`${BASE}/api/inbound/emails/${id}/read`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ isRead }),
  });
  if (!res.ok) throw new Error(`EmailSender ${res.status}: ${await res.text()}`);
}

// Poll loop example
async function pollNewEmails() {
  const count = await getUnreadCount();
  if (count === 0) return;
  const rows = await listUnreadEmails();
  for (const row of rows) {
    const full = await getEmail(row.id);
    console.log("New email:", full.subject, full.bodyText ?? full.bodyHtml);
    await markRead(row.id);
  }
}
```

### Webhook receiver (Express)

```js
import express from "express";
import crypto from "crypto";

const WEBHOOK_SECRET = "whsec_REPLACE_WITH_SECRET_FROM_DASHBOARD";

function verifySignature(rawBody, header) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header ?? ""));
}

const app = express();
app.post("/webhooks/email-received", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = req.body.toString("utf8");
  const signature = req.headers["x-webhook-signature"];

  if (!verifySignature(rawBody, signature))
    return res.status(401).send("Invalid signature");

  const payload = JSON.parse(rawBody);
  if (payload.event !== "email.received")
    return res.status(400).send("Unknown event");

  const emailId = payload.data.id;
  const full = await getEmail(emailId); // use pull client above
  // …process full…
  await markRead(emailId);

  res.json({ ok: true });
});
```

---

## Sanity-test with curl before integrating

Replace `BASE` and `APIKEY`.

```bash
# Unread count
curl -s "https://EmailSender-api.technosignage.com/api/inbound/unread-count" \
  -H "X-Api-Key: esk_REPLACE_WITH_KEY_GIVEN_TO_YOU"

# List unread emails
curl -s "https://EmailSender-api.technosignage.com/api/inbound/emails?isRead=false&take=10" \
  -H "X-Api-Key: esk_REPLACE_WITH_KEY_GIVEN_TO_YOU"

# Full email by ID
curl -s "https://EmailSender-api.technosignage.com/api/inbound/emails/27" \
  -H "X-Api-Key: esk_REPLACE_WITH_KEY_GIVEN_TO_YOU"

# Mark as read
curl -s -X PATCH "https://EmailSender-api.technosignage.com/api/inbound/emails/27/read" \
  -H "X-Api-Key: esk_REPLACE_WITH_KEY_GIVEN_TO_YOU" \
  -H "Content-Type: application/json" \
  -d '{"isRead": true}'
```

Expected: JSON with `"success": true`. If `401`, the API key is wrong or missing.

**Webhook test:** register a URL at [webhook.site](https://webhook.site), send an email to your service mailbox, confirm POST arrives with `X-Webhook-Signature`.

---

## Rules / good practices

1. **Never hard-code the API key or webhook secret.** Use configuration / environment variables / secrets manager.
2. **Always verify webhook signatures** before processing payload data.
3. **Use webhooks for real-time** and **REST for full body** — webhook payload is preview-only.
4. **Mark emails read** after successful processing to avoid duplicate handling on the next poll.
5. **Idempotency:** the same email may trigger your webhook handler more than once if you retry — use `data.id` as a deduplication key.
6. **Attachments:** only `hasAttachments` / `attachmentCount` are stored today — file bytes are **not** downloaded via IMAP yet.
7. **Polling interval:** IMAP is polled by EmailSender every ~30 seconds; your app's poll interval can be 1–5 minutes unless you use webhooks.
8. **Retry on transient failure** (`5xx`, timeout) when calling the REST API. Do **not** retry on `401` / `404`.

---

## Related docs

- Outbound (send) integration: [`EMAIL_SENDER_INTEGRATION.md`](./EMAIL_SENDER_INTEGRATION.md)
- Google AI Studio (receive): [`AI_STUDIO_INBOUND_PROMPT.md`](./AI_STUDIO_INBOUND_PROMPT.md)
- Google AI Studio (send): [`AI_STUDIO_PROMPT.md`](./AI_STUDIO_PROMPT.md)
- Deployment: [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- Database setup for inbound: [`EmailSenderApp/Database/03_inbound_emails.sql`](./EmailSenderApp/Database/03_inbound_emails.sql)
