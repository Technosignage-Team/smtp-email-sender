# EmailSender — Deployment Guide

End-to-end steps to deploy:

- **Frontend (React/Vite)** → http://EmailSender.technosignage.com
- **Backend (ASP.NET Core 8 API)** → http://EmailSender-api.technosignage.com

> The backend is built for plain HTTP (no HTTPS required).
> The frontend is configured at build time to call the backend at the URL above
> via the env file [`.env.production`](../.env.production).

---

## 1. Artifacts to copy to the servers

| Artifact | Source folder | Destination |
|---|---|---|
| Frontend static site | `dist/` | IIS site root for `EmailSender.technosignage.com` |
| Backend published app | `EmailSenderApp/publish/` | IIS site root for `EmailSender-api.technosignage.com` |

Both folders are produced by the build commands in section 6.

---

## 2. Backend deployment (IIS on Windows Server)

### Prerequisites on the server
1. Install the **.NET 8.0 Hosting Bundle** (provides ASP.NET Core Module v2 for IIS):
   <https://dotnet.microsoft.com/en-us/download/dotnet/8.0> → "Hosting Bundle"
2. After install, run `iisreset` (or restart the W3SVC service).

### Create the site in IIS
1. **Application Pools** → **Add Application Pool**
   - Name: `EmailSenderApiPool`
   - .NET CLR version: **No Managed Code**
   - Managed pipeline: Integrated
   - Identity: `ApplicationPoolIdentity` (or a service account with read access to the publish folder)
2. **Sites** → **Add Website**
   - Site name: `EmailSender-api`
   - Application pool: `EmailSenderApiPool`
   - Physical path: e.g. `C:\inetpub\wwwroot\emailsender-api` (paste the contents of `EmailSenderApp/publish/` here)
   - Binding: **http**, Host name: `EmailSender-api.technosignage.com`, Port: `80`

### Make sure the host header resolves
Your DNS A-record for `EmailSender-api.technosignage.com` must point to the public IP of the server.
If you are testing internally, add a hosts file entry on the client machine:
```
192.0.2.10   EmailSender-api.technosignage.com
192.0.2.10   EmailSender.technosignage.com
```

### Verify
Browse to:
```
http://EmailSender-api.technosignage.com/api/apps
```
You should get a JSON list of registered apps (HTTP 200).
If you get a 502.5 or "HTTP Error 500.30", run the publish folder manually with:
```powershell
cd C:\inetpub\wwwroot\emailsender-api
dotnet EmailSenderApi.dll
```
to see the real exception.

---

## 3. Frontend deployment (IIS on Windows Server)

1. **Sites** → **Add Website**
   - Site name: `EmailSender`
   - Physical path: e.g. `C:\inetpub\wwwroot\emailsender` (paste the contents of `dist/` here, including [`web.config`](../dist/web.config))
   - Binding: **http**, Host name: `EmailSender.technosignage.com`, Port: `80`
2. Make sure the **URL Rewrite** module is installed on the server
   (download: <https://www.iis.net/downloads/microsoft/url-rewrite>).
   The included `web.config` uses it for the SPA fallback rule.

### Verify
Browse to: <http://EmailSender.technosignage.com> — the React UI should appear,
and the **App Management** tab should load the app list from the API.

---

## 4. CORS

Already configured in [`EmailSenderApp/appsettings.json`](../EmailSenderApp/appsettings.json):

```json
"Cors": {
  "AllowedOrigins": [
    "http://EmailSender.technosignage.com",
    "http://emailsender.technosignage.com",
    "http://localhost:5173",
    "http://localhost:4173"
  ]
}
```

To allow another origin (e.g. an internal app), add it to this array and restart
the API site (or recycle the application pool) — no rebuild required.

---

## 5. Database

The connection string is in [`appsettings.json`](../EmailSenderApp/appsettings.json) under
`ConnectionStrings:EmailSender`. The schema script
[`EmailSenderApp/Database/01_schema.sql`](../EmailSenderApp/Database/01_schema.sql)
creates the two tables (`dbo.Apps`, `dbo.EmailLogs`) — this has already been
executed against `192.175.127.213`.

---

## 6. Build commands (run on the dev machine before deploy)

```powershell
# Frontend (outputs to dist/)
cd "E:\Email sender\smtp-email-sender"
npm install                # first time only
npm run build              # uses .env.production (VITE_API_BASE_URL)

# Backend (outputs to EmailSenderApp/publish/)
dotnet publish EmailSenderApp -c Release -o EmailSenderApp\publish
```

To target a different backend URL, edit [`.env.production`](../.env.production) and
re-run `npm run build`.

---

## 7. Using the API from another application

Endpoint URL to share with consumer apps:

```
POST http://EmailSender-api.technosignage.com/api/email/send
```

> Note: the route is **`/api/email/send`** (and **`/api/email/send-bulk`** for
> per-recipient delivery). There is no `/api/email/send-email` route.

### Required header
| Header | Value |
|---|---|
| `X-Api-Key` | the key issued from the App Management page |

### Request body — `multipart/form-data`
| Field | Type | Required | Notes |
|---|---|---|---|
| `Subject` | text | yes | |
| `Body` | text | yes | HTML or plain text |
| `IsHtml` | text | no | `true` / `false` (default `true`) |
| `Recipients` | text | no | comma-separated emails; if omitted, falls back to `SmtpConfig:ToEmail` |
| `Attachments` | file | no | repeat the field for multiple files |

### Postman quick-test

1. Method: **POST**
2. URL: `http://EmailSender-api.technosignage.com/api/email/send`
3. **Headers** tab → add `X-Api-Key: esk_...` (your key)
4. **Body** tab → choose `form-data` → add the fields above
5. Send → expect `200 OK` with `{ "success": true, ... }`

### curl equivalent
```powershell
curl.exe -X POST http://EmailSender-api.technosignage.com/api/email/send `
  -H "X-Api-Key: esk_PASTE_KEY_HERE" `
  -F "Subject=Hello from production" `
  -F "Body=<p>It works!</p>" `
  -F "IsHtml=true" `
  -F "Recipients=someone@example.com"
```

### Possible responses
| Status | Meaning |
|---|---|
| `200` | Email sent. A row was written to `dbo.EmailLogs`. |
| `400` | Bad request (invalid email, missing subject/body). |
| `401` | Missing or invalid `X-Api-Key`. |
| `403` | App exists but is deactivated. |
| `500` | SMTP failure — check the `dbo.EmailLogs` row (`Status='Failed'`, `ErrorMessage`). |

Every call (success **or** failure) is logged to `dbo.EmailLogs` and visible in the
**App Management → Logs** tab in the UI.

---

## 8. Post-deploy smoke test

1. Open <http://EmailSender.technosignage.com> → confirm the UI loads.
2. Click **App Management** → confirm the existing apps load (proves API + CORS work).
3. Click **Register app** → create a test app → copy its key.
4. In Postman, hit `POST http://EmailSender-api.technosignage.com/api/email/send`
   with that key (see section 7).
5. Refresh the **Logs** tab → the new send should appear.

---

## 9. Updating the deployment

- **Frontend change** → rebuild (`npm run build`) and copy the new `dist/` over the IIS site folder.
- **Backend change** → rebuild (`dotnet publish ...`) and copy the new `publish/` folder.
  Recycle the `EmailSenderApiPool` app pool in IIS to release file locks if needed:
  ```powershell
  Restart-WebAppPool -Name EmailSenderApiPool
  ```
