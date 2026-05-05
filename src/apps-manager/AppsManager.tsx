/**
 * AppsManager — admin page for registering 3rd-party apps and viewing logs.
 * Self-contained styles (scoped under .am-*) so it stays drop-in like EmailSender.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Power,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

export interface AppRecord {
  id: number;
  appName: string;
  appUrl?: string | null;
  appKey: string;
  description?: string | null;
  contactEmail?: string | null;
  isActive: boolean;
  dailyQuota?: number | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
  logsCount: number;
}

export interface EmailLogRecord {
  id: number;
  subject: string;
  recipients: string;
  recipientCount: number;
  attachmentCount: number;
  attachmentBytes: number;
  isHtml: boolean;
  status: 'Sent' | 'Failed' | 'Rejected';
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sentAt: string;
  durationMs?: number | null;
}

export interface AppsManagerProps {
  apiBaseUrl?: string;
  /** Public URL (origin) of the email API that you want to share with caller apps. */
  publicApiUrl?: string;
  theme?: 'light' | 'dark';
}

const STYLE_TAG_ID = 'apps-manager-module-styles';

const STYLES = `
.am-root, .am-root * { box-sizing: border-box; }
.am-root {
  --am-bg: #ffffff;
  --am-fg: #18181b;
  --am-muted: #71717a;
  --am-border: #e4e4e7;
  --am-input-bg: #ffffff;
  --am-chip-bg: #f4f4f5;
  --am-card-bg: #ffffff;
  --am-shadow: 0 10px 40px -10px rgba(0,0,0,0.15), 0 2px 6px -2px rgba(0,0,0,0.05);
  --am-accent: #6366f1;
  --am-accent-fg: #ffffff;
  --am-accent-soft: rgba(99,102,241,0.08);
  --am-success: #10b981;
  --am-error: #ef4444;
  --am-warn: #f59e0b;
  --am-radius: 16px;
  --am-radius-sm: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--am-fg);
  width: 100%;
  max-width: 1100px;
}
.am-root.am-theme-dark {
  --am-bg: #0a0a0a;
  --am-fg: #fafafa;
  --am-muted: #a1a1aa;
  --am-border: #27272a;
  --am-input-bg: #18181b;
  --am-chip-bg: #27272a;
  --am-card-bg: #111114;
  --am-shadow: 0 10px 40px -10px rgba(0,0,0,0.6), 0 2px 6px -2px rgba(0,0,0,0.3);
  --am-accent-soft: rgba(99,102,241,0.18);
}
.am-card { background: var(--am-card-bg); border: 1px solid var(--am-border); border-radius: var(--am-radius); box-shadow: var(--am-shadow); overflow: hidden; }
.am-header { padding: 18px 22px; background: linear-gradient(135deg, var(--am-accent), color-mix(in srgb, var(--am-accent) 60%, #ec4899)); color: var(--am-accent-fg); display: flex; align-items: center; gap: 12px; }
.am-header-icon { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; }
.am-title { font-size: 17px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
.am-subtitle { font-size: 12.5px; margin: 2px 0 0; opacity: 0.9; }
.am-toolbar { display: flex; gap: 10px; padding: 14px 22px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--am-border); background: color-mix(in srgb, var(--am-chip-bg) 30%, var(--am-card-bg)); }
.am-search { flex: 1; min-width: 220px; position: relative; }
.am-search input { width: 100%; padding: 9px 10px 9px 34px; background: var(--am-input-bg); color: var(--am-fg); border: 1px solid var(--am-border); border-radius: var(--am-radius-sm); font: inherit; outline: none; transition: border-color 120ms ease, box-shadow 120ms ease; }
.am-search input:focus { border-color: var(--am-accent); box-shadow: 0 0 0 3px var(--am-accent-soft); }
.am-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--am-muted); }

.am-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--am-accent); color: var(--am-accent-fg); border: 0; border-radius: var(--am-radius-sm); font: inherit; font-weight: 600; cursor: pointer; transition: filter 120ms ease; box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--am-accent) 60%, transparent); }
.am-btn:hover:not(:disabled) { filter: brightness(1.05); }
.am-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
.am-btn.am-btn-ghost { background: transparent; color: var(--am-fg); border: 1px solid var(--am-border); box-shadow: none; }
.am-btn.am-btn-ghost:hover { background: var(--am-chip-bg); }
.am-btn.am-btn-danger { background: var(--am-error); box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--am-error) 60%, transparent); }

.am-table-wrap { overflow-x: auto; }
.am-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.am-table th, .am-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--am-border); vertical-align: middle; }
.am-table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--am-muted); font-weight: 600; background: color-mix(in srgb, var(--am-chip-bg) 30%, var(--am-card-bg)); position: sticky; top: 0; }
.am-table tr:last-child td { border-bottom: 0; }
.am-table tr:hover td { background: color-mix(in srgb, var(--am-chip-bg) 20%, transparent); }
.am-name { font-weight: 600; }
.am-meta { color: var(--am-muted); font-size: 12px; }

.am-key { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; padding: 4px 8px; background: var(--am-chip-bg); border-radius: 6px; max-width: 320px; }
.am-key code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.am-icon-btn { border: 0; background: transparent; color: var(--am-muted); width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; }
.am-icon-btn:hover { background: var(--am-chip-bg); color: var(--am-fg); }

.am-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.am-badge.am-on { background: color-mix(in srgb, var(--am-success) 18%, transparent); color: color-mix(in srgb, var(--am-success) 80%, var(--am-fg)); }
.am-badge.am-off { background: color-mix(in srgb, var(--am-muted) 18%, transparent); color: var(--am-muted); }
.am-badge.am-sent { background: color-mix(in srgb, var(--am-success) 18%, transparent); color: color-mix(in srgb, var(--am-success) 80%, var(--am-fg)); }
.am-badge.am-failed { background: color-mix(in srgb, var(--am-error) 18%, transparent); color: color-mix(in srgb, var(--am-error) 80%, var(--am-fg)); }
.am-badge.am-rejected { background: color-mix(in srgb, var(--am-warn) 18%, transparent); color: color-mix(in srgb, var(--am-warn) 80%, var(--am-fg)); }

.am-row-actions { display: inline-flex; gap: 4px; }

.am-empty { padding: 40px; text-align: center; color: var(--am-muted); }
.am-banner { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--am-border); }
.am-banner.am-success { background: color-mix(in srgb, var(--am-success) 12%, transparent); color: color-mix(in srgb, var(--am-success) 80%, var(--am-fg)); }
.am-banner.am-error { background: color-mix(in srgb, var(--am-error) 12%, transparent); color: color-mix(in srgb, var(--am-error) 80%, var(--am-fg)); }

/* Modal */
.am-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 9999; }
.am-modal { background: var(--am-card-bg); color: var(--am-fg); border: 1px solid var(--am-border); border-radius: var(--am-radius); width: 100%; max-width: 520px; box-shadow: var(--am-shadow); overflow: hidden; }
.am-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--am-border); }
.am-modal-title { margin: 0; font-size: 15px; font-weight: 600; }
.am-modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.am-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--am-border); background: color-mix(in srgb, var(--am-chip-bg) 30%, transparent); }

.am-field { display: flex; flex-direction: column; gap: 4px; }
.am-label { font-size: 12px; font-weight: 600; color: var(--am-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.am-input { width: 100%; padding: 9px 11px; background: var(--am-input-bg); color: var(--am-fg); border: 1px solid var(--am-border); border-radius: var(--am-radius-sm); font: inherit; outline: none; transition: border-color 120ms ease, box-shadow 120ms ease; }
.am-input:focus { border-color: var(--am-accent); box-shadow: 0 0 0 3px var(--am-accent-soft); }
.am-textarea { min-height: 70px; resize: vertical; font-family: inherit; }
.am-help { color: var(--am-muted); font-size: 12px; }

.am-spin { animation: am-spin 800ms linear infinite; }
@keyframes am-spin { to { transform: rotate(360deg); } }

.am-tabs { display: inline-flex; background: var(--am-chip-bg); padding: 3px; border-radius: 10px; gap: 2px; }
.am-tab { border: 0; background: transparent; padding: 6px 14px; border-radius: 8px; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--am-muted); cursor: pointer; }
.am-tab.am-tab-active { background: var(--am-card-bg); color: var(--am-fg); box-shadow: 0 1px 2px rgba(0,0,0,0.08); }

.am-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; padding: 14px 22px; border-bottom: 1px solid var(--am-border); }
.am-stat { background: color-mix(in srgb, var(--am-chip-bg) 50%, transparent); border: 1px solid var(--am-border); border-radius: var(--am-radius-sm); padding: 10px 12px; }
.am-stat-label { font-size: 11px; color: var(--am-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.am-stat-value { font-size: 18px; font-weight: 700; margin-top: 2px; }
`;

function injectStylesOnce() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

function classes(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatBytes(n: number) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function AppsManager({
  apiBaseUrl = '',
  publicApiUrl,
  theme = 'light',
}: AppsManagerProps) {
  useEffect(() => injectStylesOnce(), []);

  const base = apiBaseUrl.replace(/\/$/, '');
  const sendUrl = useMemo(() => {
    const root = (publicApiUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    return `${root}/api/email/send`;
  }, [publicApiUrl]);

  const [tab, setTab] = useState<'apps' | 'logs'>('apps');
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [logs, setLogs] = useState<(EmailLogRecord & { appName: string; appId: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ appName: '', appUrl: '', description: '', contactEmail: '' });

  const refresh = async () => {
    setLoading(true);
    setBanner(null);
    try {
      const [aRes, lRes] = await Promise.all([
        fetch(`${base}/api/apps`),
        fetch(`${base}/api/apps/logs?take=200`),
      ]);
      if (!aRes.ok) throw new Error(`Failed to load apps (${aRes.status})`);
      if (!lRes.ok) throw new Error(`Failed to load logs (${lRes.status})`);
      setApps(await aRes.json());
      setLogs(await lRes.json());
    } catch (e: unknown) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (a) =>
        a.appName.toLowerCase().includes(q) ||
        (a.appUrl ?? '').toLowerCase().includes(q) ||
        (a.contactEmail ?? '').toLowerCase().includes(q),
    );
  }, [apps, search]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.appName.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.recipients.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q),
    );
  }, [logs, search]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.status === 'Sent').length;
    const failed = logs.filter((l) => l.status === 'Failed').length;
    const active = apps.filter((a) => a.isActive).length;
    return { total, sent, failed, active };
  }, [logs, apps]);

  const create = async () => {
    if (!draft.appName.trim()) {
      setBanner({ kind: 'error', text: 'App name is required.' });
      return;
    }
    try {
      const res = await fetch(`${base}/api/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setCreating(false);
      setDraft({ appName: '', appUrl: '', description: '', contactEmail: '' });
      setBanner({ kind: 'success', text: `App "${data.appName}" registered. Copy its API key now.` });
      setRevealed((r) => ({ ...r, [data.id]: true }));
      await refresh();
    } catch (e: unknown) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : 'Failed to create app' });
    }
  };

  const regenerate = async (a: AppRecord) => {
    if (!confirm(`Regenerate API key for "${a.appName}"? The old key will stop working immediately.`)) return;
    try {
      const res = await fetch(`${base}/api/apps/${a.id}/regenerate-key`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setBanner({ kind: 'success', text: `New API key generated for "${a.appName}".` });
      setRevealed((r) => ({ ...r, [a.id]: true }));
      await refresh();
    } catch (e: unknown) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const toggleActive = async (a: AppRecord) => {
    try {
      const res = await fetch(`${base}/api/apps/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await refresh();
    } catch (e: unknown) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const remove = async (a: AppRecord) => {
    if (!confirm(`Deactivate "${a.appName}"? Existing logs are kept.`)) return;
    try {
      const res = await fetch(`${base}/api/apps/${a.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await refresh();
    } catch (e: unknown) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : 'Failed' });
    }
  };

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    setBanner({
      kind: ok ? 'success' : 'error',
      text: ok ? `${label} copied to clipboard.` : `Failed to copy ${label}.`,
    });
  };

  return (
    <div className={classes('am-root', theme === 'dark' && 'am-theme-dark')}>
      <div className="am-card">
        <div className="am-header">
          <span className="am-header-icon"><KeyRound size={18} /></span>
          <div style={{ flex: 1 }}>
            <h2 className="am-title">App Management</h2>
            <p className="am-subtitle">Register apps that may call our email API. Each app gets its own key.</p>
          </div>
          <div className="am-tabs">
            <button className={classes('am-tab', tab === 'apps' && 'am-tab-active')} onClick={() => setTab('apps')}>
              Apps ({apps.length})
            </button>
            <button className={classes('am-tab', tab === 'logs' && 'am-tab-active')} onClick={() => setTab('logs')}>
              Logs ({logs.length})
            </button>
          </div>
        </div>

        <div className="am-stat-grid">
          <div className="am-stat"><div className="am-stat-label">Active apps</div><div className="am-stat-value">{stats.active}</div></div>
          <div className="am-stat"><div className="am-stat-label">Total emails</div><div className="am-stat-value">{stats.total}</div></div>
          <div className="am-stat"><div className="am-stat-label">Sent</div><div className="am-stat-value" style={{ color: 'var(--am-success)' }}>{stats.sent}</div></div>
          <div className="am-stat"><div className="am-stat-label">Failed</div><div className="am-stat-value" style={{ color: 'var(--am-error)' }}>{stats.failed}</div></div>
        </div>

        {banner && (
          <div className={classes('am-banner', banner.kind === 'success' ? 'am-success' : 'am-error')}>
            {banner.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span style={{ flex: 1 }}>{banner.text}</span>
            <button className="am-icon-btn" onClick={() => setBanner(null)} aria-label="Dismiss"><X size={14} /></button>
          </div>
        )}

        <div className="am-toolbar">
          <div className="am-search">
            <Search size={15} />
            <input
              placeholder={tab === 'apps' ? 'Search apps...' : 'Search logs...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="am-btn am-btn-ghost" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 size={14} className="am-spin" /> : <RefreshCcw size={14} />} Refresh
          </button>
          {tab === 'apps' && (
            <button className="am-btn" onClick={() => setCreating(true)}>
              <Plus size={14} /> Register app
            </button>
          )}
        </div>

        {tab === 'apps' ? (
          <AppsTable
            apps={filteredApps}
            sendUrl={sendUrl}
            revealed={revealed}
            setRevealed={setRevealed}
            onCopy={copy}
            onRegenerate={regenerate}
            onToggleActive={toggleActive}
            onRemove={remove}
          />
        ) : (
          <LogsTable logs={filteredLogs} />
        )}
      </div>

      {creating && (
        <div className="am-overlay" onClick={(e) => e.target === e.currentTarget && setCreating(false)}>
          <div className="am-modal">
            <div className="am-modal-head">
              <h3 className="am-modal-title">Register a new app</h3>
              <button className="am-icon-btn" onClick={() => setCreating(false)}><X size={16} /></button>
            </div>
            <div className="am-modal-body">
              <div className="am-field">
                <label className="am-label">App name *</label>
                <input className="am-input" value={draft.appName} onChange={(e) => setDraft({ ...draft, appName: e.target.value })} placeholder="e.g. CRM Backend" />
              </div>
              <div className="am-field">
                <label className="am-label">App URL</label>
                <input className="am-input" value={draft.appUrl} onChange={(e) => setDraft({ ...draft, appUrl: e.target.value })} placeholder="https://crm.example.com" />
              </div>
              <div className="am-field">
                <label className="am-label">Contact email</label>
                <input className="am-input" type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} placeholder="ops@example.com" />
              </div>
              <div className="am-field">
                <label className="am-label">Description</label>
                <textarea className="am-input am-textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this app uses our email service for..." />
              </div>
              <p className="am-help">An API key will be generated automatically. Share it (and the endpoint URL below) with the app owner.</p>
              <div className="am-field">
                <label className="am-label">Endpoint URL (read-only)</label>
                <input className="am-input" readOnly value={sendUrl} onClick={(e) => (e.target as HTMLInputElement).select()} />
              </div>
            </div>
            <div className="am-modal-foot">
              <button className="am-btn am-btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button className="am-btn" onClick={create}><Plus size={14} /> Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppsTable(props: {
  apps: AppRecord[];
  sendUrl: string;
  revealed: Record<number, boolean>;
  setRevealed: (r: Record<number, boolean>) => void;
  onCopy: (text: string, label: string) => void;
  onRegenerate: (a: AppRecord) => void;
  onToggleActive: (a: AppRecord) => void;
  onRemove: (a: AppRecord) => void;
}) {
  const { apps, sendUrl, revealed, setRevealed, onCopy, onRegenerate, onToggleActive, onRemove } = props;
  if (apps.length === 0) return <div className="am-empty">No apps registered yet. Click "Register app" to add one.</div>;
  return (
    <div className="am-table-wrap">
      <table className="am-table">
        <thead>
          <tr>
            <th>App</th>
            <th>API key</th>
            <th>Endpoint</th>
            <th>Status</th>
            <th>Logs</th>
            <th>Last used</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => {
            const shown = !!revealed[a.id];
            const display = shown ? a.appKey : a.appKey.replace(/./g, '•').slice(0, 18);
            return (
              <tr key={a.id}>
                <td>
                  <div className="am-name">{a.appName}</div>
                  {a.appUrl && <div className="am-meta">{a.appUrl}</div>}
                  {a.contactEmail && <div className="am-meta">{a.contactEmail}</div>}
                </td>
                <td>
                  <span className="am-key">
                    <code title={a.appKey}>{display}</code>
                    <button className="am-icon-btn" title={shown ? 'Hide' : 'Reveal'} onClick={() => setRevealed({ ...revealed, [a.id]: !shown })}>
                      {shown ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button className="am-icon-btn" title="Copy key" onClick={() => onCopy(a.appKey, 'API key')}>
                      <Copy size={13} />
                    </button>
                  </span>
                </td>
                <td>
                  <button className="am-icon-btn" title="Copy endpoint" onClick={() => onCopy(sendUrl, 'Endpoint URL')}>
                    <Copy size={13} />
                  </button>
                  <span className="am-meta" style={{ marginLeft: 4 }}>{sendUrl}</span>
                </td>
                <td>
                  <span className={classes('am-badge', a.isActive ? 'am-on' : 'am-off')}>
                    {a.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>{a.logsCount}</td>
                <td><span className="am-meta">{formatDate(a.lastUsedAt)}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <span className="am-row-actions">
                    <button className="am-icon-btn" title="Regenerate key" onClick={() => onRegenerate(a)}><RefreshCcw size={14} /></button>
                    <button className="am-icon-btn" title={a.isActive ? 'Deactivate' : 'Activate'} onClick={() => onToggleActive(a)}><Power size={14} /></button>
                    <button className="am-icon-btn" title="Delete" onClick={() => onRemove(a)}><Trash2 size={14} /></button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LogsTable({ logs }: { logs: Array<EmailLogRecord & { appName: string; appId: number }> }) {
  if (logs.length === 0) return <div className="am-empty">No emails sent yet.</div>;
  return (
    <div className="am-table-wrap">
      <table className="am-table">
        <thead>
          <tr>
            <th>When</th>
            <th>App</th>
            <th>Subject</th>
            <th>Recipients</th>
            <th>Att.</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td><span className="am-meta">{formatDate(l.sentAt)}</span></td>
              <td>{l.appName}</td>
              <td>
                <div title={l.subject} style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.subject}
                </div>
                {l.errorMessage && <div className="am-meta" style={{ color: 'var(--am-error)' }}>{l.errorMessage}</div>}
              </td>
              <td>
                <div title={l.recipients} style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.recipients || <span className="am-meta">(default)</span>}
                </div>
                <span className="am-meta">{l.recipientCount} recipient{l.recipientCount === 1 ? '' : 's'}</span>
              </td>
              <td><span className="am-meta">{l.attachmentCount > 0 ? `${l.attachmentCount} (${formatBytes(l.attachmentBytes)})` : '—'}</span></td>
              <td>
                <span className={classes('am-badge', l.status === 'Sent' ? 'am-sent' : l.status === 'Failed' ? 'am-failed' : 'am-rejected')}>
                  {l.status}
                </span>
              </td>
              <td><span className="am-meta">{l.durationMs ? `${l.durationMs} ms` : '—'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AppsManager;
