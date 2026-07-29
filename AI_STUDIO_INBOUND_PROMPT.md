# Google AI Studio — EmailSender Inbound (Receive Email) Integration Prompt

Use this guide to build an external app in **Google AI Studio** that receives email
notifications from EmailSender (inbox polling + optional webhooks).

> **Sending emails?** See [`AI_STUDIO_PROMPT.md`](./AI_STUDIO_PROMPT.md) for the outbound API.
>
> **Full API reference:** [`EMAIL_INBOUND_INTEGRATION.md`](./EMAIL_INBOUND_INTEGRATION.md)

---

## Before you start (EmailSender admin — one-time)

1. Deploy EmailSender (frontend + backend) and run `03_inbound_emails.sql` on the database.
2. In **Account → My Services → Edit Service**:
   - Enable **IMAP listening**
   - IMAP server: `imappro.zoho.com` (hostname only — **no** `http://`)
   - Port: `993`, SSL: on
   - Username/password: mailbox credentials
3. Copy your service **API key** (`esk_…`) from the service card.
4. Confirm inbox works: send a test email → **Account → Inbox** shows it within ~30s.

---

## Architecture (two modes)

| Mode | How it works | Best for |
|---|---|---|
| **Polling** | Your app calls `GET /api/inbound/*` on a timer or button click | First integration, AI Studio MVP |
| **Webhooks** | EmailSender POSTs to your app's public URL when mail arrives | Real-time notifications |

**Important for AI Studio:** API calls and webhook handling must run **server-side**
(in your Cloud Run / Node backend). Never put `X-Api-Key` in browser JavaScript.

---

## STEP 1 — Environment variables (your external app)

Set these in AI Studio / Cloud Run / `.env` (never commit secrets to git):

```env
EMAIL_SENDER_BASE_URL=https://EmailSender-api.technosignage.com
EMAIL_SENDER_API_KEY=esk_REPLACE_WITH_YOUR_SERVICE_KEY
EMAIL_SENDER_WEBHOOK_SECRET=whsec_REPLACE_AFTER_REGISTERING_WEBHOOK
```

---

## STEP 2 — Paste this as System Instructions in AI Studio

```
You are a helpful inbox assistant connected to EmailSender.

You can:
- check_inbox — list new unread emails received for this service
- get_email_details — read the full body of a specific email by id

Rules:
- When the user asks about new mail, unread messages, or inbox, call check_inbox.
- When the user asks to read/open a specific email, call get_email_details with its id.
- Summarize emails clearly: from, subject, date, and a short preview of the body.
- After showing an email to the user, mention that it was marked as read in EmailSender.
- Never invent email content — only use data returned by the functions.
- If check_inbox returns zero emails, say the inbox is empty.
- API credentials are handled server-side; never ask the user for the API key.
```

---

## STEP 3 — Add Function Declarations in AI Studio

In AI Studio → **Tools** → **Function declarations**, add both:

### Function 1: `check_inbox`

```json
{
  "name": "check_inbox",
  "description": "Check for new unread emails received via EmailSender IMAP. Returns a list of unread messages with id, from, subject, preview, and received date.",
  "parameters": {
    "type": "object",
    "properties": {
      "take": {
        "type": "integer",
        "description": "Max emails to return (default 20, max 200)."
      }
    }
  }
}
```

### Function 2: `get_email_details`

```json
{
  "name": "get_email_details",
  "description": "Get the full content of a received email by its id (from check_inbox). Returns subject, from, bodyText, bodyHtml, and attachment info.",
  "parameters": {
    "type": "object",
    "properties": {
      "emailId": {
        "type": "integer",
        "description": "The email id returned by check_inbox."
      }
    },
    "required": ["emailId"]
  }
}
```

---

## STEP 4 — Implement function handlers (server-side JavaScript)

Paste this into your AI Studio app's **backend** code (e.g. `server.js` / Cloud Run handler).
Replace env vars with your real values.

```js
const BASE   = process.env.EMAIL_SENDER_BASE_URL ?? "https://EmailSender-api.technosignage.com";
const APIKEY = process.env.EMAIL_SENDER_API_KEY;

function apiHeaders(json = false) {
  const h = { "X-Api-Key": APIKEY };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

/** Called when Gemini invokes check_inbox */
async function handleCheckInbox(args = {}) {
  const take = Math.min(args.take ?? 20, 200);

  const countRes = await fetch(`${BASE}/api/inbound/unread-count`, {
    headers: apiHeaders(),
  });
  const countData = await countRes.json();
  if (!countRes.ok) throw new Error(countData.error ?? `HTTP ${countRes.status}`);

  if (countData.unreadCount === 0) {
    return { unreadCount: 0, emails: [] };
  }

  const listRes = await fetch(`${BASE}/api/inbound/emails?isRead=false&take=${take}`, {
    headers: apiHeaders(),
  });
  const listData = await listRes.json();
  if (!listRes.ok) throw new Error(listData.error ?? `HTTP ${listRes.status}`);

  return {
    unreadCount: countData.unreadCount,
    emails: listData.rows,
  };
}

/** Called when Gemini invokes get_email_details */
async function handleGetEmailDetails(args) {
  const id = args.emailId;
  if (!id) throw new Error("emailId is required");

  const res = await fetch(`${BASE}/api/inbound/emails/${id}`, {
    headers: apiHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

  // Mark read after fetching so the same email is not returned again
  await fetch(`${BASE}/api/inbound/emails/${id}/read`, {
    method: "PATCH",
    headers: apiHeaders(true),
    body: JSON.stringify({ isRead: true }),
  });

  return data.email;
}

/** Route Gemini function calls */
async function dispatchFunctionCall(name, args) {
  switch (name) {
    case "check_inbox":       return handleCheckInbox(args);
    case "get_email_details": return handleGetEmailDetails(args);
    default: throw new Error(`Unknown function: ${name}`);
  }
}
```

---

## STEP 5 (Optional) — Webhook receiver for real-time notifications

Use this when you want EmailSender to **push** to your app instantly (no polling delay).

### 5a — Deploy your app first, then register webhook

1. Deploy your AI Studio app to Cloud Run (or any public HTTPS host).
2. Note your URL, e.g. `https://your-app-xxxxx.run.app`
3. In EmailSender → **Account → My Services → Webhooks** → Add:
   ```
   https://your-app-xxxxx.run.app/webhooks/email-received
   ```
4. Copy the **webhook secret** (`whsec_…`) → set `EMAIL_SENDER_WEBHOOK_SECRET`

### 5b — Webhook route (add to your server)

```js
import crypto from "crypto";

function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

/** Express example — use express.raw() for this route only */
app.post(
  "/webhooks/email-received",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const rawBody = req.body.toString("utf8");
    const signature = req.headers["x-webhook-signature"];
    const secret = process.env.EMAIL_SENDER_WEBHOOK_SECRET;

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody);
    if (payload.event !== "email.received") {
      return res.status(400).json({ error: "Unknown event" });
    }

    const emailId = payload.data?.id;
    if (!emailId) return res.status(400).json({ error: "Missing email id" });

    // Fetch full body (webhook only sends preview)
    const full = await handleGetEmailDetails({ emailId });

    // TODO: store in DB, push to UI, notify Gemini session, etc.
    console.log("New email:", full.subject, "from", full.from);

    res.json({ ok: true, emailId, subject: full.subject });
  }
);
```

---

## STEP 6 — Wire Gemini function calling loop

Typical pattern in your chat endpoint:

```js
// 1. Send user message to Gemini with function declarations attached
// 2. If Gemini returns a functionCall:
const result = await dispatchFunctionCall(
  functionCall.name,
  functionCall.args
);
// 3. Send function result back to Gemini
// 4. Gemini generates the final user-facing reply
```

Refer to Google's Gemini function-calling docs for your SDK (JS/Python).

---

## API Reference (inbound)

| | |
|---|---|
| **Base URL** | `https://EmailSender-api.technosignage.com` |
| **Auth header** | `X-Api-Key: esk_…` (same key as sending) |

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/inbound/unread-count` | How many unread emails |
| GET | `/api/inbound/emails?isRead=false&take=20` | List unread emails |
| GET | `/api/inbound/emails/{id}` | Full email body |
| PATCH | `/api/inbound/emails/{id}/read` | Mark read `{ "isRead": true }` |

### Webhook POST (EmailSender → your app)

| Header | Value |
|---|---|
| `X-Webhook-Event` | `email.received` |
| `X-Webhook-Signature` | `sha256=<hmac-sha256 of raw JSON body>` |

---

## Sanity test (before AI Studio)

Replace `YOUR_KEY`:

```bash
curl -s "https://EmailSender-api.technosignage.com/api/inbound/unread-count" \
  -H "X-Api-Key: YOUR_KEY"

curl -s "https://EmailSender-api.technosignage.com/api/inbound/emails?isRead=false&take=5" \
  -H "X-Api-Key: YOUR_KEY"
```

Expected: `{ "success": true, "unreadCount": N, ... }`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `401 Unauthorized` | Wrong or missing `X-Api-Key` |
| Empty inbox | IMAP not enabled on service, or email not sent to that mailbox |
| Webhook never fires | URL not HTTPS, or webhook disabled in dashboard |
| `401` on webhook | Wrong `whsec_…` secret or body parsed before signature check |
| CORS error in browser | Call EmailSender from **server-side** only, not browser fetch |

---

## Checklist

- [ ] EmailSender deployed, IMAP enabled, test email appears in Inbox tab
- [ ] Service API key copied to `EMAIL_SENDER_API_KEY`
- [ ] System instructions pasted in AI Studio
- [ ] Function declarations added (`check_inbox`, `get_email_details`)
- [ ] Server handlers implemented and tested with curl
- [ ] (Optional) Webhook URL registered + secret set + POST route deployed
- [ ] Gemini function-calling loop wired end-to-end
