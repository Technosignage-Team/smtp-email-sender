# `<EmailSender />` — drop-in email module

A self-contained React component that talks to the **EmailSenderApp** .NET API
(`POST /api/email/send`). It ships its own scoped styles, so you can drop it
into any React app **without changing the host's design** — no Tailwind, no
global CSS, no className collisions.

## Install peer requirements

The host app only needs:

- `react` ^18 or ^19
- `lucide-react` (already in this workspace)

## Usage

```tsx
import { EmailSender, type EmailTemplate } from './email-sender';

const templates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome email',
    subject: 'Welcome, {{name}}!',
    body: '<p>Hi {{name}},</p><p>Thanks for joining {{company}}.</p>',
    isHtml: true,
  },
];

export default function Page() {
  return (
    <EmailSender
      apiBaseUrl="https://localhost:50633"   // EmailSenderApp .NET API
      templates={templates}
      defaultRecipients={['ops@example.com']}
      onSuccess={(r) => console.log('sent', r)}
    />
  );
}
```

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `apiBaseUrl` | `string` | `''` (same origin) |
| `defaultRecipients` | `string[]` | `[]` |
| `defaultSubject` / `defaultBody` | `string` | `''` |
| `recipientMode` | `'single' \| 'multiple'` | inferred |
| `allowRecipientModeToggle` | `boolean` | `true` |
| `templates` | `EmailTemplate[]` | `[]` |
| `allowAttachments` | `boolean` | `true` |
| `maxAttachmentBytes` | `number` | `25 * 1024 * 1024` |
| `title` / `subtitle` | `string` | "Send Email" / … |
| `accentColor` | CSS color | `#6366f1` |
| `theme` | `'light' \| 'dark'` | `'light'` |
| `resetOnSuccess` | `boolean` | `true` |
| `onSuccess` / `onError` | callbacks | — |

## Templates & placeholders

Use `{{name}}` style tokens in `subject` and `body`. The module auto-detects
placeholders and renders an inline form so the user can fill them in before
sending.

## Backend contract

`POST {apiBaseUrl}/api/email/send` — `multipart/form-data`:

- `Subject` — string (required)
- `Body` — string (required, HTML by default)
- `Recipients` — comma/semicolon-separated list (optional → falls back to
  `SmtpConfig:ToEmail` from `appsettings.json`)
- `IsHtml` — `"true" | "false"`
- `Attachments` — zero or more files

## Why "drop-in"?

All styles live under a `.es-root` class and are injected once via a
`<style id="email-sender-module-styles">` tag. The component does not import
any CSS file and does not use Tailwind utilities, so it cannot leak into or
inherit from the host application's styles.
