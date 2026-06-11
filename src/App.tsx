/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { EmailSender } from './email-sender';
import { AccountDashboard } from './account';

type View = 'send' | 'account';

const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export default function App() {
  const [theme, setTheme]   = useState<'light' | 'dark'>('light');
  const [view, setView]     = useState<View>('account');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('es_api_key') || '');

  const isDark = theme === 'dark';

  const vars = {
    bg:      isDark ? '#09090b' : '#f0f0f2',
    navBg:   isDark ? '#18181b' : '#ffffff',
    border:  isDark ? '#27272a' : '#e4e4e7',
    text:    isDark ? '#fafafa' : '#18181b',
    muted:   isDark ? '#71717a' : '#6b7280',
    accent:  '#6366f1',
  };

  const navBtn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    border: 'none',
    background: active ? vars.accent : 'transparent',
    color: active ? '#ffffff' : vars.muted,
    borderRadius: 8,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    transition: 'background 150ms, color 150ms',
  });

  return (
    <div style={{ minHeight: '100vh', background: vars.bg, color: vars.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* ── Top Navigation Bar ── */}
      <nav style={{
        background: vars.navBg,
        borderBottom: `1px solid ${vars.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 20px',
          height: 54,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {/* Brand */}
          <div style={{
            fontWeight: 800,
            fontSize: 15,
            color: vars.accent,
            letterSpacing: '-0.02em',
            marginRight: 12,
            userSelect: 'none',
          }}>
            ✉ EmailSender
          </div>

          {/* Nav Tabs */}
          <button style={navBtn(view === 'send')}    onClick={() => setView('send')}>
            Send Email
          </button>
          <button style={navBtn(view === 'account')} onClick={() => setView('account')}>
            Account
          </button>

          <div style={{ flex: 1 }} />

          {/* API Key input — visible only on Send tab */}
          {view === 'send' && (
            <input
              type="password"
              placeholder="X-Api-Key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                localStorage.setItem('es_api_key', e.target.value);
              }}
              style={{
                width: 260,
                padding: '6px 11px',
                border: `1px solid ${vars.border}`,
                background: isDark ? '#09090b' : '#f4f4f5',
                color: vars.text,
                borderRadius: 8,
                font: 'inherit',
                fontSize: 12,
                fontFamily: 'ui-monospace, monospace',
                outline: 'none',
                marginRight: 8,
              }}
            />
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title="Toggle theme"
            style={{
              background: 'transparent',
              border: `1px solid ${vars.border}`,
              color: vars.muted,
              padding: '5px 11px',
              borderRadius: 8,
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 12,
            }}
          >
            {isDark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main style={{ width: '100%' }}>
        {view === 'send' && (
          <div style={{ padding: '28px 24px' }}>
            <EmailSender
              apiBaseUrl={API_BASE}
              apiKey={apiKey}
              templates={[]}
              theme={theme}
              subtitle="Backed by EmailSenderApp (.NET)"
              onSuccess={(r) => console.log('[EmailSender] success:', r)}
              onError={(e)   => console.error('[EmailSender] error:', e)}
            />
          </div>
        )}
        {view === 'account' && (
          <AccountDashboard apiBaseUrl={API_BASE} theme={theme} />
        )}
      </main>
    </div>
  );
}
