# Google AI Studio — EmailSender API Integration Prompt (Send Email)

Copy everything inside the box below and paste it as the **System Instructions** in Google AI Studio.

> **Receiving emails / inbox notifications?** See [`AI_STUDIO_INBOUND_PROMPT.md`](./AI_STUDIO_INBOUND_PROMPT.md)

---

## STEP 1 — Paste this as System Instructions in AI Studio

```
You are a helpful email assistant. You can send emails on behalf of the user using the send_email function.

Rules:
- When the user asks to send an email, call send_email immediately.
- Extract recipients, subject, and body from the user's message.
- If any required field is missing, ask for it before calling the function.
- Build a clean, professional HTML email body unless the user asks for plain text.
- Never invent email addresses — only use what the user provides.
- After the function returns, tell the user if the email succeeded or failed.
- If the user says "me" or "myself" as recipient, ask for their actual email address.
```

---

## STEP 2 — Add this Function Declaration in AI Studio

In AI Studio → **Tools** → **Function declarations**, add:

```json
{
  "name": "send_email",
  "description": "Send an email to one or more recipients using the EmailSender API. Call this whenever the user wants to send an email.",
  "parameters": {
    "type": "object",
    "properties": {
      "recipients": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of recipient email addresses, e.g. [\"alice@example.com\", \"bob@example.com\"]"
      },
      "subject": {
        "type": "string",
        "description": "Plain-text subject line of the email"
      },
      "body": {
        "type": "string",
        "description": "Email body content. Use proper HTML formatting by default (e.g. <p>, <strong>, <br>). Use plain text only if the user asks."
      },
      "isHtml": {
        "type": "boolean",
        "description": "True if body contains HTML (default). False for plain text."
      }
    },
    "required": ["recipients", "subject", "body"]
  }
}
```

---

## STEP 3 — Handle the function call in your code

When Gemini calls `send_email`, your code must execute this HTTP request:

### JavaScript / fetch
```js
async function handleSendEmail(args) {
  const res = await fetch("https://EmailSender-api.technosignage.com/api/email/send-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I"
    },
    body: JSON.stringify({
      recipients: args.recipients,
      subject:    args.subject,
      body:       args.body,
      isHtml:     args.isHtml !== false
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data; // { success: true, message: "...", recipientCount: N, appName: "..." }
}
```

### Python (requests)
```python
import requests

def handle_send_email(args):
    resp = requests.post(
        "https://EmailSender-api.technosignage.com/api/email/send-ai",
        headers={
            "Content-Type": "application/json",
            "X-Api-Key": "esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I"
        },
        json={
            "recipients": args["recipients"],
            "subject":    args["subject"],
            "body":       args["body"],
            "isHtml":     args.get("isHtml", True)
        }
    )
    resp.raise_for_status()
    return resp.json()
```

---

## API Reference

| | |
|---|---|
| **Endpoint** | `POST https://EmailSender-api.technosignage.com/api/email/send-ai` |
| **Auth header** | `X-Api-Key: esk_rlEjjRpRCvPQy0Eyl1hnCtPRyHotTlB5rCKpqXqJG6I` |
| **Content-Type** | `application/json` |

### Request body
```json
{
  "recipients": ["user@example.com"],
  "subject": "Hello",
  "body": "<p>Hi there!</p>",
  "isHtml": true
}
```

### Success response (200)
```json
{
  "success": true,
  "message": "Email sent successfully",
  "recipientCount": 1,
  "appName": "techno"
}
```

### Error responses
| Status | Meaning |
|---|---|
| `400` | Missing subject, body, or recipients |
| `401` | Missing or invalid API key |
| `403` | App is deactivated |
| `500` | SMTP failure |

---

## Why this works now (vs the old endpoint)

The old `/api/email/send` required **multipart/form-data**, which AI tools and browser `fetch()` struggle with.

The new `/api/email/send-ai` accepts **plain JSON** — exactly what Gemini function calling, OpenAI Actions, Claude tools, `fetch()`, and `axios` all produce natively. No special encoding needed.
