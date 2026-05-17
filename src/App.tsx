/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { EmailSender, type EmailTemplate } from './email-sender';
import { AppsManager } from './apps-manager';
import { AiChat } from './ai-chat';
import { AccountDashboard } from './account';

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome email',
    description: 'Greet a new user',
    subject: 'Welcome to {{company}}, {{name}}!',
    body:
      '<p>Hi {{name}},</p>' +
      '<p>Thanks for joining <strong>{{company}}</strong>. We are thrilled to have you.</p>' +
      '<p>— The {{company}} team</p>',
    isHtml: true,
  },
  {
    id: 'invoice',
    name: 'Invoice reminder',
    description: 'Polite payment nudge',
    subject: 'Invoice {{invoice}} reminder',
    body:
      '<p>Hello {{name}},</p>' +
      '<p>This is a friendly reminder that invoice <strong>{{invoice}}</strong> ' +
      'for <strong>{{amount}}</strong> is due on {{dueDate}}.</p>',
    isHtml: true,
  },
  {
    id: 'plain',
    name: 'Plain text note',
    subject: 'Quick note',
    body: 'Hi {{name}},\n\nJust a quick note.\n\nThanks!',
    isHtml: false,
  },
];

type View = 'send' | 'apps' | 'ai' | 'account';

// Production: set VITE_API_BASE_URL=https://EmailSender-api.technosignage.com at build time.
// Development: leave empty to use the Vite dev proxy.
const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<View>('send');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('es_api_key') || '');

  const wrap: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: 24,
    background: theme === 'dark' ? '#09090b' : '#f4f4f5',
    transition: 'background 200ms ease',
  };

  const navWrap: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 1100,
  };

  const navBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: '1px solid',
    borderColor: active
      ? '#6366f1'
      : theme === 'dark' ? '#27272a' : '#e4e4e7',
    background: active ? '#6366f1' : 'transparent',
    color: active ? '#fff' : theme === 'dark' ? '#fafafa' : '#27272a',
    borderRadius: 10,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
  });

  const small: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid',
    borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
    color: theme === 'dark' ? '#fafafa' : '#27272a',
    padding: '6px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 12,
  };

  const keyInput: React.CSSProperties = {
    flex: 1,
    minWidth: 240,
    maxWidth: 380,
    padding: '7px 11px',
    border: '1px solid',
    borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
    background: theme === 'dark' ? '#18181b' : '#ffffff',
    color: theme === 'dark' ? '#fafafa' : '#27272a',
    borderRadius: 8,
    font: 'inherit',
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  };

  return (
    <div style={wrap}>
      <div style={navWrap}>
        <button style={navBtn(view === 'send')} onClick={() => setView('send')}>Send Email</button>
        <button style={navBtn(view === 'apps')} onClick={() => setView('apps')}>App Management</button>
        <button style={navBtn(view === 'ai')}      onClick={() => setView('ai')}>AI Email Chat</button>
        <button style={navBtn(view === 'account')} onClick={() => setView('account')}>Account</button>
        <span style={{ flex: 1 }} />
        {view === 'send' && (
          <input
            style={keyInput}
            type="password"
            placeholder="Paste API key (X-Api-Key)"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              localStorage.setItem('es_api_key', e.target.value);
            }}
          />
        )}
        <button style={small} onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
          {theme === 'light' ? 'Dark' : 'Light'} theme
        </button>
      </div>

      {view === 'send' && (
        <EmailSender
          apiBaseUrl={API_BASE}
          apiKey={apiKey}
          templates={TEMPLATES}
          theme={theme}
          subtitle="Backed by EmailSenderApp (.NET)"
          onSuccess={(r) => console.log('[EmailSender] success:', r)}
          onError={(e) => console.error('[EmailSender] error:', e)}
        />
      )}
      {view === 'apps' && <AppsManager apiBaseUrl={API_BASE} theme={theme} />}
      {view === 'ai'      && <AiChat apiBaseUrl={API_BASE} apiKey={apiKey} theme={theme} />}
      {view === 'account'  && <AccountDashboard apiBaseUrl={API_BASE} theme={theme} />}
    </div>
  );
}
