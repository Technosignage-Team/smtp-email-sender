/**
 * AccountDashboard — full-width dashboard with role-based access control.
 * Sections: My Services | Email Logs | Admin Panel (superadmin only)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, Code2, Copy, Eye, EyeOff,
  KeyRound, Loader2, LogOut, Mail, Pencil, Plus,
  RefreshCcw, Send, Shield, Trash2, User, X,
  FileText, Users, Settings, Filter, ChevronLeft, ChevronRight as ChevRight,
  Inbox, Bell, Webhook,
} from 'lucide-react';

// ── Scoped CSS ────────────────────────────────────────────────────────────────
const CSS = `
.ad *,.ad *::before,.ad *::after{box-sizing:border-box;}
.ad{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;color:var(--ad-text);}
/* auth page */
.ad-auth-wrap{display:flex;justify-content:center;padding:60px 16px;}
.ad-card{background:var(--ad-card);border:1px solid var(--ad-border);border-radius:16px;padding:28px 28px 24px;box-shadow:0 4px 24px rgba(0,0,0,.08);width:100%;max-width:440px;}
.ad-card h2{font-size:1.25rem;font-weight:700;margin-bottom:4px;}
.ad-card p{color:var(--ad-muted);font-size:13px;margin-bottom:20px;}
/* top bar */
.ad-topbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 28px;background:var(--ad-card);border-bottom:1px solid var(--ad-border);}
.ad-topbar-title{font-size:1rem;font-weight:700;flex:1;}
.ad-username{display:flex;align-items:center;gap:5px;font-size:13px;color:var(--ad-muted);}
.ad-role-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#ede9fe;color:#5b21b6;}
.ad-dark .ad-role-badge{background:#2e1065;color:#c4b5fd;}
.ad-role-badge.admin{background:#fef3c7;color:#92400e;}
.ad-dark .ad-role-badge.admin{background:#451a03;color:#fde68a;}
/* section tabs */
.ad-section-nav{display:flex;gap:0;border-bottom:1px solid var(--ad-border);padding:0 28px;background:var(--ad-card);}
.ad-section-tab{display:inline-flex;align-items:center;gap:6px;padding:12px 16px;border:none;background:transparent;color:var(--ad-muted);font:inherit;font-size:13px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s,border-color .15s;}
.ad-section-tab.active{color:#6366f1;border-bottom-color:#6366f1;}
.ad-section-tab:hover:not(.active){color:var(--ad-text);}
/* content area */
.ad-content{padding:28px;}
/* auth tabs */
.ad-tabs{display:flex;gap:2px;background:var(--ad-input);border-radius:10px;padding:3px;margin-bottom:20px;}
.ad-tab{flex:1;padding:7px;border:none;border-radius:8px;background:transparent;color:var(--ad-muted);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s;}
.ad-tab.active{background:var(--ad-card);color:var(--ad-text);box-shadow:0 1px 4px rgba(0,0,0,.1);}
/* form */
.ad-field{display:flex;flex-direction:column;gap:4px;margin-bottom:14px;}
.ad-field label{font-size:12px;font-weight:600;color:var(--ad-muted);}
.ad-input{padding:9px 11px;border:1px solid var(--ad-border);border-radius:8px;background:var(--ad-input);color:var(--ad-text);font:inherit;font-size:13px;outline:none;transition:border-color .15s;width:100%;}
.ad-input:focus{border-color:#6366f1;}
.ad-input-wrap{position:relative;display:flex;align-items:center;}
.ad-input-wrap .ad-input{padding-right:38px;}
.ad-eye{position:absolute;right:10px;background:none;border:none;color:var(--ad-muted);cursor:pointer;padding:2px;display:grid;place-items:center;}
/* buttons */
.ad-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:none;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,opacity .15s;}
.ad-btn:disabled{opacity:.5;cursor:not-allowed;}
.ad-btn-primary{background:#6366f1;color:#fff;}
.ad-btn-primary:hover:not(:disabled){background:#4f46e5;}
.ad-btn-ghost{background:var(--ad-input);color:var(--ad-muted);border:1px solid var(--ad-border);}
.ad-btn-ghost:hover:not(:disabled){color:var(--ad-text);}
.ad-btn-danger{background:transparent;color:#ef4444;border:1px solid #fca5a5;}
.ad-btn-danger:hover:not(:disabled){background:#fef2f2;}
.ad-btn-full{width:100%;justify-content:center;margin-top:4px;}
.ad-btn-sm{padding:5px 10px;font-size:12px;}
/* alert */
.ad-alert{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;}
.ad-alert.err{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;}
.ad-alert.ok {background:#f0fdf4;color:#166534;border:1px solid #86efac;}
.ad-dark .ad-alert.err{background:#450a0a;color:#fca5a5;border-color:#7f1d1d;}
.ad-dark .ad-alert.ok {background:#052e16;color:#86efac;border-color:#064e3b;}
/* services grid */
.ad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;}
/* service card */
.ad-scard{background:var(--ad-card);border:1px solid var(--ad-border);border-radius:14px;overflow:hidden;transition:box-shadow .15s;}
.ad-scard:hover{box-shadow:0 4px 16px rgba(99,102,241,.12);}
.ad-scard-head{padding:16px;border-bottom:1px solid var(--ad-border);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ad-scard-head h3{font-size:.95rem;font-weight:700;margin:0;}
.ad-scard-meta{font-size:12px;color:var(--ad-muted);display:flex;align-items:center;gap:4px;margin-top:2px;}
.ad-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:2px 7px;border-radius:999px;}
.ad-badge.on {background:#d1fae5;color:#065f46;}
.ad-badge.off{background:#fee2e2;color:#991b1b;}
.ad-dark .ad-badge.on {background:#052e16;color:#6ee7b7;}
.ad-dark .ad-badge.off{background:#450a0a;color:#fca5a5;}
/* key row */
.ad-key-row{display:flex;align-items:center;gap:6px;padding:10px 16px;background:var(--ad-input);font-family:ui-monospace,monospace;font-size:11px;color:var(--ad-muted);border-bottom:1px solid var(--ad-border);}
.ad-key-val{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ad-icon-btn{background:none;border:none;color:var(--ad-muted);cursor:pointer;padding:3px;display:grid;place-items:center;border-radius:5px;transition:color .15s,background .15s;}
.ad-icon-btn:hover{color:var(--ad-text);background:var(--ad-border);}
/* templates */
.ad-tmpl-area{padding:12px 16px;}
.ad-tmpl-area h4{font-size:11px;font-weight:700;color:var(--ad-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;}
.ad-tmpl-list{display:flex;flex-direction:column;gap:7px;}
.ad-tmpl-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--ad-input);border-radius:8px;border:1px solid var(--ad-border);}
.ad-tmpl-info{flex:1;min-width:0;}
.ad-tmpl-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ad-tmpl-subj{font-size:11px;color:var(--ad-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ad-add-chip{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:6px 12px;border-radius:8px;border:1px dashed var(--ad-border);color:var(--ad-muted);background:none;font:inherit;font-size:12px;cursor:pointer;transition:border-color .15s,color .15s;}
.ad-add-chip:hover{border-color:#6366f1;color:#6366f1;}
/* service card actions */
.ad-scard-actions{padding:10px 16px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--ad-border);}
/* add service card */
.ad-add-card{background:var(--ad-card);border:2px dashed var(--ad-border);border-radius:14px;display:grid;place-items:center;min-height:140px;cursor:pointer;transition:border-color .15s,color .15s;color:var(--ad-muted);}
.ad-add-card:hover{border-color:#6366f1;color:#6366f1;}
/* modal */
.ad-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:9999;padding:16px;}
.ad-modal{background:var(--ad-card);border:1px solid var(--ad-border);border-radius:16px;padding:24px;width:100%;max-width:460px;box-shadow:0 8px 32px rgba(0,0,0,.18);max-height:90vh;overflow-y:auto;}
.ad-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.ad-modal-head h3{font-size:1rem;font-weight:700;margin:0;}
/* spin */
@keyframes ad-spin{to{transform:rotate(360deg)}}
.ad-spin{animation:ad-spin .8s linear infinite;}
/* test + integrate */
.ad-code{background:var(--ad-input);border:1px solid var(--ad-border);border-radius:8px;padding:10px 12px;font-family:ui-monospace,monospace;font-size:11px;white-space:pre-wrap;word-break:break-all;color:var(--ad-text);max-height:220px;overflow-y:auto;}
.ad-section-label{font-size:11px;font-weight:700;color:var(--ad-muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 5px;}
.ad-copy-block{position:relative;}
.ad-copy-btn-abs{position:absolute;top:6px;right:6px;}
.ad-test-status{padding:8px 12px;border-radius:8px;font-size:13px;margin-top:10px;}
.ad-test-status.ok{background:#f0fdf4;color:#166534;border:1px solid #86efac;}
.ad-test-status.err{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;}
.ad-dark .ad-test-status.ok{background:#052e16;color:#86efac;border-color:#064e3b;}
.ad-dark .ad-test-status.err{background:#450a0a;color:#fca5a5;border-color:#7f1d1d;}
/* ── Logs & Tables ── */
.ad-filter-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;padding:14px 16px;background:var(--ad-card);border:1px solid var(--ad-border);border-radius:10px;}
.ad-filter-field{display:flex;flex-direction:column;gap:3px;}
.ad-filter-field label{font-size:11px;font-weight:600;color:var(--ad-muted);}
.ad-filter-field .ad-input{width:auto;min-width:120px;}
.ad-table-wrap{width:100%;overflow-x:auto;border:1px solid var(--ad-border);border-radius:10px;}
.ad-table{width:100%;border-collapse:collapse;font-size:13px;}
.ad-table th{text-align:left;padding:9px 12px;background:var(--ad-input);font-size:11px;font-weight:700;color:var(--ad-muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--ad-border);white-space:nowrap;}
.ad-table td{padding:10px 12px;border-bottom:1px solid var(--ad-border);color:var(--ad-text);vertical-align:middle;}
.ad-table tr:last-child td{border-bottom:none;}
.ad-table tbody tr:hover td{background:var(--ad-input);}
.ad-status-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;}
.ad-status-Sent{background:#d1fae5;color:#065f46;}
.ad-status-Failed{background:#fee2e2;color:#991b1b;}
.ad-status-Rejected{background:#fef3c7;color:#92400e;}
.ad-dark .ad-status-Sent{background:#052e16;color:#6ee7b7;}
.ad-dark .ad-status-Failed{background:#450a0a;color:#fca5a5;}
.ad-dark .ad-status-Rejected{background:#451a03;color:#fde68a;}
.ad-pagination{display:flex;align-items:center;gap:8px;padding:12px 0;justify-content:flex-end;font-size:13px;color:var(--ad-muted);}
.ad-empty{padding:48px;text-align:center;color:var(--ad-muted);font-size:13px;}
/* admin sub-tabs */
.ad-sub-tabs{display:flex;gap:4px;margin-bottom:20px;}
.ad-sub-tab{padding:7px 14px;border-radius:8px;border:1px solid var(--ad-border);background:transparent;color:var(--ad-muted);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,color .15s,border-color .15s;}
.ad-sub-tab.active{background:#6366f1;color:#fff;border-color:#6366f1;}
.ad-sub-tab:hover:not(.active){color:var(--ad-text);}
/* section header */
.ad-section-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px;}
.ad-section-header h3{font-size:1rem;font-weight:700;margin:0;}
/* truncate */
.ad-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;}
`;

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserDto {
  id: number;
  username: string;
  email?: string;
  role: string;
}

interface ServiceDto {
  id: number; name: string; apiKey: string;
  senderEmail: string | null; senderName: string | null;
  smtpUsername: string | null; hasSmtpPassword: boolean;
  smtpServer: string | null; smtpPort: number | null; smtpEncryption: string | null;
  imapEnabled: boolean; imapServer: string | null; imapPort: number | null;
  imapUsername: string | null; hasImapPassword: boolean; imapUseSsl: boolean;
  lastImapPollAt: string | null;
  isActive: boolean; description: string | null; createdAt: string;
}

interface InboundEmailDto {
  id: number; appId: number; appName: string;
  fromAddress: string; fromName: string | null; toAddress: string;
  subject: string; bodyPreview: string | null;
  hasAttachments: boolean; attachmentCount: number;
  isRead: boolean; receivedAt: string;
}

interface WebhookDto {
  id: number; appId: number; url: string; secret: string;
  events: string; isActive: boolean; createdAt: string;
}

interface TemplateDto {
  id: number; appId: number; name: string; subject: string; body: string; isHtml: boolean;
}

interface LogDto {
  id: number; appId: number; appName: string;
  subject: string; recipients: string; recipientCount: number;
  status: string; errorMessage: string | null;
  isHtml: boolean; attachmentCount: number;
  sentAt: string; durationMs: number | null;
}

interface AdminUserDto {
  id: number; username: string; email: string | null;
  role: string; isActive: boolean; createdAt: string; servicesCount: number;
}

interface AdminServiceDto {
  id: number; appName: string; appKey: string;
  senderEmail: string | null; senderName: string | null;
  smtpServer: string | null; smtpPort: number | null;
  isActive: boolean; userId: number | null; ownerUsername: string | null;
  logsCount: number; createdAt: string;
}

interface AdminLogDto extends LogDto {
  ownerId: number | null;
  ownerUsername: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ── Component ──────────────────────────────────────────────────────────────────
export interface AccountDashboardProps {
  apiBaseUrl: string;
  theme: 'light' | 'dark';
}

type DashSection = 'services' | 'inbound' | 'logs' | 'admin';

export function AccountDashboard({ apiBaseUrl, theme }: AccountDashboardProps) {
  injectCss();

  const isDark = theme === 'dark';
  const cssVars: React.CSSProperties = {
    '--ad-text':   isDark ? '#fafafa' : '#18181b',
    '--ad-muted':  isDark ? '#71717a' : '#71717a',
    '--ad-card':   isDark ? '#18181b' : '#ffffff',
    '--ad-border': isDark ? '#27272a' : '#e4e4e7',
    '--ad-input':  isDark ? '#09090b' : '#f4f4f5',
  } as React.CSSProperties;

  // ── Auth state ────────────────────────────────────────────────────────────
  const [token,    setToken]    = useState<string | null>(() => localStorage.getItem('acc_token'));
  const [user,     setUser]     = useState<UserDto | null>(null);
  const [busy,     setBusy]     = useState(false);
  const [alert,    setAlert]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [authTab,  setAuthTab]  = useState<'login' | 'register'>('login');
  const [formUser, setFormUser] = useState('');
  const [formPass, setFormPass] = useState('');
  const [formEmail,setFormEmail]= useState('');
  const [showPass, setShowPass] = useState(false);

  // ── Dashboard section ─────────────────────────────────────────────────────
  const [section, setSection] = useState<DashSection>('services');

  // ── Services state ────────────────────────────────────────────────────────
  const [services,  setServices]  = useState<ServiceDto[]>([]);
  const [templates, setTemplates] = useState<Record<number, TemplateDto[]>>({});
  const [expanded,  setExpanded]  = useState<number | null>(null);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<
    | { type: 'service'; service?: ServiceDto }
    | { type: 'template'; appId: number; template?: TemplateDto }
    | { type: 'test'; service: ServiceDto }
    | { type: 'integrate'; service: ServiceDto }
    | { type: 'webhooks'; service: ServiceDto }
    | { type: 'inbound-detail'; email: InboundEmailDto }
    | null
  >(null);

  // ── Inbound emails state ──────────────────────────────────────────────────
  const [inbound,       setInbound]       = useState<InboundEmailDto[]>([]);
  const [inboundTotal,  setInboundTotal]  = useState(0);
  const [inboundPage,   setInboundPage]   = useState(0);
  const [inboundUnread, setInboundUnread] = useState<boolean | ''>('');
  const [inboundLoading,setInboundLoading]= useState(false);
  const INBOUND_PAGE_SIZE = 50;

  // ── My Logs state ─────────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState<LogDto[]>([]);
  const [logsTotal,  setLogsTotal]  = useState(0);
  const [logsPage,   setLogsPage]   = useState(0);
  const [logsStatus, setLogsStatus] = useState('');
  const [logsFrom,   setLogsFrom]   = useState('');
  const [logsTo,     setLogsTo]     = useState('');
  const [logsLoading,setLogsLoading]= useState(false);
  const LOGS_PAGE_SIZE = 50;

  // ── Admin state ───────────────────────────────────────────────────────────
  const [adminTab,        setAdminTab]        = useState<'users' | 'services' | 'logs' | 'inbound'>('users');
  const [adminUsers,      setAdminUsers]      = useState<AdminUserDto[]>([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [adminServices,   setAdminServices]   = useState<AdminServiceDto[]>([]);
  const [adminSvcTotal,   setAdminSvcTotal]   = useState(0);
  const [adminLogs,       setAdminLogs]       = useState<AdminLogDto[]>([]);
  const [adminLogsTotal,  setAdminLogsTotal]  = useState(0);
  const [adminLogsPage,   setAdminLogsPage]   = useState(0);
  const [adminLogUserId,  setAdminLogUserId]  = useState('');
  const [adminLogAppId,   setAdminLogAppId]   = useState('');
  const [adminLogStatus,  setAdminLogStatus]  = useState('');
  const [adminLogFrom,    setAdminLogFrom]    = useState('');
  const [adminLogTo,      setAdminLogTo]      = useState('');
  const [adminLoading,    setAdminLoading]    = useState(false);
  const [adminInbound,    setAdminInbound]    = useState<(InboundEmailDto & { ownerUsername?: string })[]>([]);
  const [adminInboundTotal, setAdminInboundTotal] = useState(0);
  const [adminModal, setAdminModal] = useState<
    | { type: 'create-service' }
    | null
  >(null);

  const base = apiBaseUrl;
  const isSuperAdmin = user?.role === 'superadmin';

  // ── API helper ────────────────────────────────────────────────────────────
  const api = useCallback(async (method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const tok = localStorage.getItem('acc_token');
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
    const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data;
  }, [base]);

  const saveToken = useCallback((t: string) => {
    localStorage.setItem('acc_token', t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('acc_token');
    setToken(null); setUser(null); setServices([]); setTemplates({});
    setLogs([]); setAdminUsers([]); setAdminServices([]); setAdminLogs([]);
    setAlert(null); setSection('services');
  }, []);

  // ── Verify token on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api('GET', '/api/account/me')
      .then((u: UserDto) => { setUser(u); loadServices(); })
      .catch(() => { localStorage.removeItem('acc_token'); setToken(null); });
  }, []); // eslint-disable-line

  // ── Services ──────────────────────────────────────────────────────────────
  const loadServices = useCallback(async () => {
    try { setServices(await api('GET', '/api/account/services')); }
    catch { /* silent */ }
  }, [api]);

  const loadTemplates = useCallback(async (appId: number) => {
    if (templates[appId]) return;
    try {
      const t: TemplateDto[] = await api('GET', `/api/account/services/${appId}/templates`);
      setTemplates(prev => ({ ...prev, [appId]: t }));
    } catch { /* silent */ }
  }, [api, templates]);

  const toggleExpand = useCallback((id: number) => {
    setExpanded(prev => { if (prev === id) return null; loadTemplates(id); return id; });
  }, [loadTemplates]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null); setBusy(true);
    try {
      const body = authTab === 'login'
        ? { username: formUser, password: formPass }
        : { username: formUser, password: formPass, email: formEmail || undefined };
      const res = await api('POST', `/api/account/${authTab}`, body);
      saveToken(res.token); setUser(res.user); await loadServices();
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    } finally { setBusy(false); }
  }, [authTab, formUser, formPass, formEmail, api, saveToken, loadServices]);

  const copy = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

  const normalizeMailHost = (value: string) => {
    let host = value.trim();
    if (!host) return '';
    host = host.replace(/^https?:\/\//i, '');
    const slash = host.indexOf('/');
    if (slash >= 0) host = host.slice(0, slash);
    return host.replace(/\.+$/, '').trim();
  };

  // ── Service CRUD ──────────────────────────────────────────────────────────
  const handleSaveService = useCallback(async (data: {
    name: string; senderEmail: string; senderName: string;
    smtpUsername: string; smtpPassword: string;
    smtpServer: string; smtpPort: string; smtpEncryption: string;
    imapEnabled: boolean; imapServer: string; imapPort: string;
    imapUsername: string; imapPassword: string; imapUseSsl: boolean;
  }, editId?: number) => {
    setBusy(true); setAlert(null);
    const payload = {
      name: data.name, senderEmail: data.senderEmail,
      senderName: data.senderName || undefined,
      smtpUsername: data.smtpUsername || undefined,
      smtpPassword: data.smtpPassword || undefined,
      smtpServer: data.smtpServer || undefined,
      smtpPort: data.smtpPort ? parseInt(data.smtpPort) : undefined,
      smtpEncryption: data.smtpEncryption || undefined,
      imapEnabled: data.imapEnabled,
      imapServer: normalizeMailHost(data.imapServer) || undefined,
      imapPort: data.imapPort ? parseInt(data.imapPort) : undefined,
      imapUsername: data.imapUsername || undefined,
      imapPassword: data.imapPassword || undefined,
      imapUseSsl: data.imapUseSsl,
    };
    try {
      if (editId) {
        const updated: ServiceDto = await api('PATCH', `/api/account/services/${editId}`, payload);
        setServices(prev => prev.map(s => s.id === editId ? updated : s));
      } else {
        const created: ServiceDto = await api('POST', '/api/account/services', payload);
        setServices(prev => [created, ...prev]);
      }
      setModal(null);
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    } finally { setBusy(false); }
  }, [api]);

  const handleDeleteService = useCallback(async (id: number) => {
    if (!confirm('Deactivate this service?')) return;
    try {
      await api('DELETE', `/api/account/services/${id}`);
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s));
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    }
  }, [api]);

  const handleRegenKey = useCallback(async (id: number) => {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) return;
    try {
      const updated: ServiceDto = await api('POST', `/api/account/services/${id}/regenerate-key`);
      setServices(prev => prev.map(s => s.id === id ? updated : s));
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    }
  }, [api]);

  // ── Templates ─────────────────────────────────────────────────────────────
  const handleSaveTemplate = useCallback(async (appId: number, data: {
    name: string; subject: string; body: string; isHtml: boolean;
  }, editId?: number) => {
    setBusy(true); setAlert(null);
    try {
      if (editId) {
        const updated: TemplateDto = await api('PATCH', `/api/account/services/${appId}/templates/${editId}`, data);
        setTemplates(prev => ({ ...prev, [appId]: prev[appId]?.map(t => t.id === editId ? updated : t) ?? [] }));
      } else {
        const created: TemplateDto = await api('POST', `/api/account/services/${appId}/templates`, data);
        setTemplates(prev => ({ ...prev, [appId]: [...(prev[appId] ?? []), created] }));
      }
      setModal(null);
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    } finally { setBusy(false); }
  }, [api]);

  const handleDeleteTemplate = useCallback(async (appId: number, tid: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api('DELETE', `/api/account/services/${appId}/templates/${tid}`);
      setTemplates(prev => ({ ...prev, [appId]: prev[appId]?.filter(t => t.id !== tid) ?? [] }));
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    }
  }, [api]);

  // ── My Logs ───────────────────────────────────────────────────────────────
  const loadMyLogs = useCallback(async (page = 0) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String(page * LOGS_PAGE_SIZE), take: String(LOGS_PAGE_SIZE),
        ...(logsStatus && { status: logsStatus }),
        ...(logsFrom   && { from: logsFrom }),
        ...(logsTo     && { to: logsTo }),
      });
      const res = await api('GET', `/api/account/logs?${params}`);
      setLogs(res.rows); setLogsTotal(res.total); setLogsPage(page);
    } catch { /* silent */ } finally { setLogsLoading(false); }
  }, [api, logsStatus, logsFrom, logsTo]);

  // ── Inbound Emails ────────────────────────────────────────────────────────
  const loadMyInbound = useCallback(async (page = 0) => {
    setInboundLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String(page * INBOUND_PAGE_SIZE), take: String(INBOUND_PAGE_SIZE),
        ...(inboundUnread !== '' && { isRead: String(inboundUnread === false) }),
      });
      const res = await api('GET', `/api/account/inbound/emails?${params}`);
      setInbound(res.rows); setInboundTotal(res.total); setInboundPage(page);
    } catch { /* silent */ } finally { setInboundLoading(false); }
  }, [api, inboundUnread]);

  const markInboundRead = useCallback(async (id: number, isRead = true) => {
    try {
      await api('PATCH', `/api/account/inbound/emails/${id}/read`, { isRead });
      setInbound(prev => prev.map(e => e.id === id ? { ...e, isRead } : e));
    } catch { /* silent */ }
  }, [api]);

  const loadAdminInbound = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await api('GET', '/api/account/admin/inbound/emails?take=200');
      setAdminInbound(res.rows); setAdminInboundTotal(res.total);
    } catch { /* silent */ } finally { setAdminLoading(false); }
  }, [api]);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const loadAdminUsers = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await api('GET', '/api/account/admin/users?take=200');
      setAdminUsers(res.users); setAdminUsersTotal(res.total);
    } catch { /* silent */ } finally { setAdminLoading(false); }
  }, [api]);

  const loadAdminServices = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await api('GET', '/api/account/admin/services?take=200');
      setAdminServices(res.services); setAdminSvcTotal(res.total);
    } catch { /* silent */ } finally { setAdminLoading(false); }
  }, [api]);

  const loadAdminLogs = useCallback(async (page = 0) => {
    setAdminLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String(page * LOGS_PAGE_SIZE), take: String(LOGS_PAGE_SIZE),
        ...(adminLogUserId && { userId: adminLogUserId }),
        ...(adminLogAppId  && { appId: adminLogAppId }),
        ...(adminLogStatus && { status: adminLogStatus }),
        ...(adminLogFrom   && { from: adminLogFrom }),
        ...(adminLogTo     && { to: adminLogTo }),
      });
      const res = await api('GET', `/api/account/admin/logs?${params}`);
      setAdminLogs(res.rows); setAdminLogsTotal(res.total); setAdminLogsPage(page);
    } catch { /* silent */ } finally { setAdminLoading(false); }
  }, [api, adminLogUserId, adminLogAppId, adminLogStatus, adminLogFrom, adminLogTo]);

  const handleToggleUser = useCallback(async (id: number, active: boolean) => {
    try {
      await api('PATCH', `/api/account/admin/users/${id}/status`, { isActive: active });
      setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: active } : u));
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    }
  }, [api]);

  const handleAdminRegenKey = useCallback(async (id: number) => {
    if (!confirm('Regenerate API key for this service?')) return;
    try {
      await api('POST', `/api/account/admin/services/${id}/regenerate-key`);
      loadAdminServices();
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    }
  }, [api, loadAdminServices]);

  const handleAdminDeactivateService = useCallback(async (id: number) => {
    if (!confirm('Deactivate this service?')) return;
    try {
      await api('DELETE', `/api/account/admin/services/${id}`);
      setAdminServices(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s));
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    }
  }, [api]);

  // Load section data on tab switch
  useEffect(() => {
    if (!user) return;
    if (section === 'logs') loadMyLogs(0);
    if (section === 'inbound') loadMyInbound(0);
    if (section === 'admin' && isSuperAdmin) {
      if (adminTab === 'users')    loadAdminUsers();
      if (adminTab === 'services') loadAdminServices();
      if (adminTab === 'logs')     loadAdminLogs(0);
      if (adminTab === 'inbound')  loadAdminInbound();
    }
  }, [section, adminTab]); // eslint-disable-line

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`ad${isDark ? ' ad-dark' : ''}`} style={cssVars}>

      {/* ── LOGIN / REGISTER ── */}
      {!user && (
        <div className="ad-auth-wrap">
          <div className="ad-card">
            <h2>Account</h2>
            <p>Sign in to manage your email services</p>
            <div className="ad-tabs">
              <button className={`ad-tab${authTab === 'login'    ? ' active' : ''}`} onClick={() => { setAuthTab('login');    setAlert(null); }}>Sign In</button>
              <button className={`ad-tab${authTab === 'register' ? ' active' : ''}`} onClick={() => { setAuthTab('register'); setAlert(null); }}>Register</button>
            </div>
            {alert && <div className={`ad-alert ${alert.type}`}>{alert.msg}</div>}
            <form onSubmit={handleAuth}>
              <div className="ad-field">
                <label>Username</label>
                <input className="ad-input" value={formUser} onChange={e => setFormUser(e.target.value)} placeholder="yourusername" autoComplete="username" required />
              </div>
              {authTab === 'register' && (
                <div className="ad-field">
                  <label>Email (optional)</label>
                  <input className="ad-input" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              )}
              <div className="ad-field">
                <label>Password</label>
                <div className="ad-input-wrap">
                  <input className="ad-input" type={showPass ? 'text' : 'password'} value={formPass} onChange={e => setFormPass(e.target.value)} autoComplete={authTab === 'login' ? 'current-password' : 'new-password'} required />
                  <button type="button" className="ad-eye" onClick={() => setShowPass(p => !p)}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="ad-btn ad-btn-primary ad-btn-full" disabled={busy}>
                {busy ? <Loader2 size={15} className="ad-spin" /> : <User size={15} />}
                {authTab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {user && (
        <>
          {/* Top bar */}
          <div className="ad-topbar">
            <span className="ad-topbar-title">Account Dashboard</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ad-username"><User size={13} />{user.username}</span>
              <span className={`ad-role-badge${user.role === 'superadmin' ? ' admin' : ''}`}>
                {user.role === 'superadmin' ? <><Shield size={10} /> Super Admin</> : 'User'}
              </span>
              <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={logout}><LogOut size={13} /> Sign out</button>
            </div>
          </div>

          {/* Section navigation */}
          <div className="ad-section-nav">
            <button className={`ad-section-tab${section === 'services' ? ' active' : ''}`} onClick={() => setSection('services')}>
              <Settings size={14} /> My Services
            </button>
            <button className={`ad-section-tab${section === 'inbound' ? ' active' : ''}`} onClick={() => setSection('inbound')}>
              <Inbox size={14} /> Inbox
            </button>
            <button className={`ad-section-tab${section === 'logs' ? ' active' : ''}`} onClick={() => setSection('logs')}>
              <FileText size={14} /> Sent Logs
            </button>
            {isSuperAdmin && (
              <button className={`ad-section-tab${section === 'admin' ? ' active' : ''}`} onClick={() => setSection('admin')}>
                <Shield size={14} /> Admin Panel
              </button>
            )}
          </div>

          {/* Global alert */}
          {alert && (
            <div style={{ padding: '0 28px', marginTop: 16 }}>
              <div className={`ad-alert ${alert.type}`}>{alert.msg}</div>
            </div>
          )}

          {/* ── MY SERVICES ── */}
          {section === 'services' && (
            <div className="ad-content">
              <div className="ad-section-header">
                <h3>My Services ({services.length})</h3>
                <button className="ad-btn ad-btn-primary" onClick={() => setModal({ type: 'service' })}>
                  <Plus size={14} /> Add Service
                </button>
              </div>
              <div className="ad-grid">
                {services.map(svc => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    templates={templates[svc.id]}
                    isExpanded={expanded === svc.id}
                    onToggle={() => toggleExpand(svc.id)}
                    onEdit={() => setModal({ type: 'service', service: svc })}
                    onDelete={() => handleDeleteService(svc.id)}
                    onRegenKey={() => handleRegenKey(svc.id)}
                    onCopy={copy}
                    onTest={() => { loadTemplates(svc.id); setModal({ type: 'test', service: svc }); }}
                    onIntegrate={() => { loadTemplates(svc.id); setModal({ type: 'integrate', service: svc }); }}
                    onWebhooks={() => setModal({ type: 'webhooks', service: svc })}
                    onAddTemplate={() => setModal({ type: 'template', appId: svc.id })}
                    onEditTemplate={(t) => setModal({ type: 'template', appId: svc.id, template: t })}
                    onDeleteTemplate={(tid) => handleDeleteTemplate(svc.id, tid)}
                  />
                ))}
                <div className="ad-add-card" onClick={() => setModal({ type: 'service' })}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Plus size={24} /><span style={{ fontSize: 13, fontWeight: 600 }}>Add Service</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── INBOX (received emails) ── */}
          {section === 'inbound' && (
            <div className="ad-content">
              <div className="ad-section-header">
                <h3>Received Emails (Inbox)</h3>
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => loadMyInbound(inboundPage)}>
                  <RefreshCcw size={13} /> Refresh
                </button>
              </div>
              <div className="ad-filter-bar">
                <div className="ad-filter-field">
                  <label>Filter</label>
                  <select className="ad-input" value={inboundUnread === '' ? '' : inboundUnread ? 'unread' : 'read'}
                    onChange={e => setInboundUnread(e.target.value === '' ? '' : e.target.value === 'unread')}>
                    <option value="">All</option>
                    <option value="unread">Unread only</option>
                    <option value="read">Read only</option>
                  </select>
                </div>
                <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => loadMyInbound(0)}>
                  <Filter size={13} /> Apply
                </button>
              </div>
              {inboundLoading ? <div className="ad-empty"><Loader2 size={22} className="ad-spin" /></div> : (
                <>
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Service</th><th>From</th><th>Subject</th><th>Preview</th>
                          <th>Received</th><th>Status</th><th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inbound.length === 0 && (
                          <tr><td colSpan={7} className="ad-empty">
                            No received emails yet. Enable IMAP on a service to start listening.
                          </td></tr>
                        )}
                        {inbound.map(e => (
                          <tr key={e.id} style={{ opacity: e.isRead ? 0.75 : 1 }}>
                            <td style={{ fontSize: 12 }}>{e.appName}</td>
                            <td style={{ fontSize: 12 }}>
                              <div>{e.fromName ?? e.fromAddress}</div>
                              <div style={{ color: 'var(--ad-muted)', fontSize: 11 }}>{e.fromAddress}</div>
                            </td>
                            <td><div className="ad-truncate" style={{ maxWidth: 220 }} title={e.subject}>{e.subject}</div></td>
                            <td style={{ fontSize: 12, color: 'var(--ad-muted)' }}>
                              <div className="ad-truncate" style={{ maxWidth: 260 }}>{e.bodyPreview ?? '—'}</div>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--ad-muted)', whiteSpace: 'nowrap' }}>{fmtDate(e.receivedAt)}</td>
                            <td>
                              <span className={`ad-badge ${e.isRead ? 'off' : 'on'}`}>{e.isRead ? 'Read' : 'New'}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="ad-btn ad-btn-ghost ad-btn-sm"
                                  onClick={() => setModal({ type: 'inbound-detail', email: e })}>View</button>
                                {!e.isRead && (
                                  <button className="ad-btn ad-btn-ghost ad-btn-sm"
                                    onClick={() => markInboundRead(e.id)}>Mark read</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="ad-pagination">
                    <span>{inboundTotal} total · page {inboundPage + 1}</span>
                    <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={inboundPage === 0}
                      onClick={() => loadMyInbound(inboundPage - 1)}><ChevronLeft size={14} /></button>
                    <button className="ad-btn ad-btn-ghost ad-btn-sm"
                      disabled={(inboundPage + 1) * INBOUND_PAGE_SIZE >= inboundTotal}
                      onClick={() => loadMyInbound(inboundPage + 1)}><ChevRight size={14} /></button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── MY EMAIL LOGS ── */}
          {section === 'logs' && (
            <div className="ad-content">
              <div className="ad-section-header">
                <h3>Email Logs</h3>
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => loadMyLogs(logsPage)}>
                  <RefreshCcw size={13} /> Refresh
                </button>
              </div>
              <LogsFilterBar
                status={logsStatus} onStatus={setLogsStatus}
                from={logsFrom}     onFrom={setLogsFrom}
                to={logsTo}         onTo={setLogsTo}
                onApply={() => loadMyLogs(0)}
                onReset={() => { setLogsStatus(''); setLogsFrom(''); setLogsTo(''); setTimeout(() => loadMyLogs(0), 0); }}
              />
              <LogsTable
                logs={logs} loading={logsLoading} showOwner={false}
                total={logsTotal} page={logsPage} pageSize={LOGS_PAGE_SIZE}
                onPage={(p) => loadMyLogs(p)}
              />
            </div>
          )}

          {/* ── ADMIN PANEL ── */}
          {section === 'admin' && isSuperAdmin && (
            <div className="ad-content">
              <div className="ad-section-header">
                <h3>Admin Panel</h3>
              </div>
              <div className="ad-sub-tabs">
                <button className={`ad-sub-tab${adminTab === 'users'    ? ' active' : ''}`} onClick={() => setAdminTab('users')}>
                  <Users size={13} style={{ display:'inline',marginRight:4 }} />Users
                </button>
                <button className={`ad-sub-tab${adminTab === 'services' ? ' active' : ''}`} onClick={() => setAdminTab('services')}>
                  <Settings size={13} style={{ display:'inline',marginRight:4 }} />All Services
                </button>
                <button className={`ad-sub-tab${adminTab === 'logs'     ? ' active' : ''}`} onClick={() => setAdminTab('logs')}>
                  <FileText size={13} style={{ display:'inline',marginRight:4 }} />Sent Logs
                </button>
                <button className={`ad-sub-tab${adminTab === 'inbound'  ? ' active' : ''}`} onClick={() => setAdminTab('inbound')}>
                  <Inbox size={13} style={{ display:'inline',marginRight:4 }} />All Inbox
                </button>
              </div>

              {/* Users Tab */}
              {adminTab === 'users' && (
                <>
                  <div className="ad-section-header" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--ad-muted)' }}>{adminUsersTotal} users total</span>
                    <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={loadAdminUsers}>
                      <RefreshCcw size={13} /> Refresh
                    </button>
                  </div>
                  {adminLoading ? <div className="ad-empty"><Loader2 size={20} className="ad-spin" /></div> : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>ID</th><th>Username</th><th>Email</th>
                            <th>Role</th><th>Services</th><th>Status</th>
                            <th>Created</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminUsers.length === 0 && (
                            <tr><td colSpan={8} className="ad-empty">No users found.</td></tr>
                          )}
                          {adminUsers.map(u => (
                            <tr key={u.id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.id}</td>
                              <td><strong>{u.username}</strong></td>
                              <td style={{ color: 'var(--ad-muted)' }}>{u.email ?? '—'}</td>
                              <td>
                                <span className={`ad-role-badge${u.role === 'superadmin' ? ' admin' : ''}`}>
                                  {u.role === 'superadmin' ? 'Super Admin' : 'User'}
                                </span>
                              </td>
                              <td>{u.servicesCount}</td>
                              <td>
                                <span className={`ad-badge ${u.isActive ? 'on' : 'off'}`}>
                                  {u.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--ad-muted)', fontSize: 12 }}>{fmtDate(u.createdAt)}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    className={`ad-btn ad-btn-sm ${u.isActive ? 'ad-btn-danger' : 'ad-btn-ghost'}`}
                                    onClick={() => handleToggleUser(u.id, !u.isActive)}
                                  >
                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* All Services Tab */}
              {adminTab === 'services' && (
                <>
                  <div className="ad-section-header" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--ad-muted)' }}>{adminSvcTotal} services total</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => setAdminModal({ type: 'create-service' })}>
                        <Plus size={13} /> Create Service
                      </button>
                      <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={loadAdminServices}>
                        <RefreshCcw size={13} /> Refresh
                      </button>
                    </div>
                  </div>
                  {adminLoading ? <div className="ad-empty"><Loader2 size={20} className="ad-spin" /></div> : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>Service</th><th>Owner</th><th>Sender Email</th>
                            <th>SMTP</th><th>API Key</th><th>Logs</th>
                            <th>Status</th><th>Created</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminServices.length === 0 && (
                            <tr><td colSpan={9} className="ad-empty">No services found.</td></tr>
                          )}
                          {adminServices.map(s => (
                            <tr key={s.id}>
                              <td><strong className="ad-truncate" style={{ display:'block' }}>{s.appName}</strong></td>
                              <td style={{ color: 'var(--ad-muted)', fontSize: 12 }}>{s.ownerUsername ?? '—'}</td>
                              <td style={{ color: 'var(--ad-muted)', fontSize: 12 }}>{s.senderEmail ?? '—'}</td>
                              <td style={{ color: 'var(--ad-muted)', fontSize: 12 }}>{s.smtpServer ? `${s.smtpServer}:${s.smtpPort ?? 587}` : 'Global'}</td>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ad-muted)' }}>
                                  {s.appKey.substring(0, 16)}…
                                </span>
                                <button className="ad-icon-btn" style={{ marginLeft: 4 }} onClick={() => copy(s.appKey)} title="Copy key">
                                  <Copy size={11} />
                                </button>
                              </td>
                              <td style={{ fontSize: 12 }}>{s.logsCount}</td>
                              <td><span className={`ad-badge ${s.isActive ? 'on' : 'off'}`}>{s.isActive ? 'Active' : 'Off'}</span></td>
                              <td style={{ color: 'var(--ad-muted)', fontSize: 12 }}>{fmtDate(s.createdAt)}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="ad-btn ad-btn-ghost ad-btn-sm" title="Regenerate key" onClick={() => handleAdminRegenKey(s.id)}>
                                    <RefreshCcw size={12} />
                                  </button>
                                  {s.isActive && (
                                    <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => handleAdminDeactivateService(s.id)}>
                                      Off
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* All Logs Tab */}
              {adminTab === 'logs' && (
                <>
                  <div className="ad-filter-bar">
                    <div className="ad-filter-field">
                      <label>User ID</label>
                      <input className="ad-input" style={{ width: 90 }} value={adminLogUserId} onChange={e => setAdminLogUserId(e.target.value)} placeholder="all" />
                    </div>
                    <div className="ad-filter-field">
                      <label>Service ID</label>
                      <input className="ad-input" style={{ width: 90 }} value={adminLogAppId} onChange={e => setAdminLogAppId(e.target.value)} placeholder="all" />
                    </div>
                    <div className="ad-filter-field">
                      <label>Status</label>
                      <select className="ad-input" value={adminLogStatus} onChange={e => setAdminLogStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="Sent">Sent</option>
                        <option value="Failed">Failed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="ad-filter-field">
                      <label>From</label>
                      <input className="ad-input" type="date" value={adminLogFrom} onChange={e => setAdminLogFrom(e.target.value)} />
                    </div>
                    <div className="ad-filter-field">
                      <label>To</label>
                      <input className="ad-input" type="date" value={adminLogTo} onChange={e => setAdminLogTo(e.target.value)} />
                    </div>
                    <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => loadAdminLogs(0)}>
                      <Filter size={13} /> Apply
                    </button>
                    <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => {
                      setAdminLogUserId(''); setAdminLogAppId(''); setAdminLogStatus('');
                      setAdminLogFrom(''); setAdminLogTo('');
                      setTimeout(() => loadAdminLogs(0), 0);
                    }}>
                      Reset
                    </button>
                  </div>
                  <LogsTable
                    logs={adminLogs as LogDto[]} loading={adminLoading} showOwner={true}
                    total={adminLogsTotal} page={adminLogsPage} pageSize={LOGS_PAGE_SIZE}
                    onPage={(p) => loadAdminLogs(p)}
                  />
                </>
              )}

              {/* All Inbound Tab */}
              {adminTab === 'inbound' && (
                <>
                  <div className="ad-section-header" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--ad-muted)' }}>{adminInboundTotal} received emails total</span>
                    <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={loadAdminInbound}>
                      <RefreshCcw size={13} /> Refresh
                    </button>
                  </div>
                  {adminLoading ? <div className="ad-empty"><Loader2 size={20} className="ad-spin" /></div> : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>Owner</th><th>Service</th><th>From</th><th>Subject</th>
                            <th>Received</th><th>Read</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminInbound.length === 0 && (
                            <tr><td colSpan={6} className="ad-empty">No received emails found.</td></tr>
                          )}
                          {adminInbound.map(e => (
                            <tr key={e.id}>
                              <td style={{ fontSize: 12, color: 'var(--ad-muted)' }}>{e.ownerUsername ?? '—'}</td>
                              <td style={{ fontSize: 12 }}>{e.appName}</td>
                              <td style={{ fontSize: 12 }}>{e.fromAddress}</td>
                              <td><div className="ad-truncate" style={{ maxWidth: 220 }}>{e.subject}</div></td>
                              <td style={{ fontSize: 12, color: 'var(--ad-muted)' }}>{fmtDate(e.receivedAt)}</td>
                              <td><span className={`ad-badge ${e.isRead ? 'off' : 'on'}`}>{e.isRead ? 'Read' : 'New'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SERVICE MODALS ── */}
      {modal?.type === 'service' && (
        <ServiceModal service={modal.service} busy={busy} isDark={isDark}
          onClose={() => setModal(null)}
          onSave={(data) => handleSaveService(data, modal.service?.id)} />
      )}
      {modal?.type === 'template' && (
        <TemplateModal appId={modal.appId} template={modal.template} busy={busy} isDark={isDark}
          onClose={() => setModal(null)}
          onSave={(data) => handleSaveTemplate(modal.appId, data, modal.template?.id)} />
      )}
      {modal?.type === 'test' && (
        <TestEmailModal service={modal.service} templates={templates[modal.service.id] ?? []}
          apiBaseUrl={base} isDark={isDark} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'integrate' && (
        <IntegrateModal service={modal.service} templates={templates[modal.service.id] ?? []}
          apiBaseUrl={base} isDark={isDark} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'webhooks' && (
        <WebhooksModal service={modal.service} api={api} isDark={isDark} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'inbound-detail' && (
        <InboundDetailModal email={modal.email} api={api} isDark={isDark}
          onClose={() => setModal(null)}
          onMarkRead={(id) => { markInboundRead(id); setModal(null); }} />
      )}

      {/* ── ADMIN CREATE SERVICE MODAL ── */}
      {adminModal?.type === 'create-service' && (
        <AdminCreateServiceModal
          isDark={isDark}
          users={adminUsers}
          onClose={() => setAdminModal(null)}
          onSave={async (data) => {
            try {
              await api('POST', '/api/account/admin/services', data);
              setAdminModal(null);
              loadAdminServices();
              setAlert({ type: 'ok', msg: 'Service created successfully.' });
            } catch (err: unknown) {
              setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
            }
          }}
        />
      )}
    </div>
  );
}

// ── LogsFilterBar ─────────────────────────────────────────────────────────────
function LogsFilterBar({ status, onStatus, from, onFrom, to, onTo, onApply, onReset }: {
  status: string; onStatus: (v: string) => void;
  from: string;   onFrom:   (v: string) => void;
  to: string;     onTo:     (v: string) => void;
  onApply: () => void; onReset: () => void;
}) {
  return (
    <div className="ad-filter-bar">
      <div className="ad-filter-field">
        <label>Status</label>
        <select className="ad-input" value={status} onChange={e => onStatus(e.target.value)}>
          <option value="">All</option>
          <option value="Sent">Sent</option>
          <option value="Failed">Failed</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      <div className="ad-filter-field">
        <label>From</label>
        <input className="ad-input" type="date" value={from} onChange={e => onFrom(e.target.value)} />
      </div>
      <div className="ad-filter-field">
        <label>To</label>
        <input className="ad-input" type="date" value={to} onChange={e => onTo(e.target.value)} />
      </div>
      <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={onApply}>
        <Filter size={13} /> Apply
      </button>
      <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={onReset}>Reset</button>
    </div>
  );
}

// ── LogsTable ─────────────────────────────────────────────────────────────────
function LogsTable({ logs, loading, showOwner, total, page, pageSize, onPage }: {
  logs: LogDto[]; loading: boolean; showOwner: boolean;
  total: number; page: number; pageSize: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) return <div className="ad-empty"><Loader2 size={22} className="ad-spin" /></div>;

  return (
    <>
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              {showOwner && <th>Owner</th>}
              <th>Service</th><th>Subject</th><th>Recipients</th>
              <th>Status</th><th>Sent At</th><th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={showOwner ? 7 : 6} className="ad-empty">No logs found.</td></tr>
            )}
            {logs.map(l => (
              <tr key={l.id}>
                {showOwner && (
                  <td style={{ fontSize: 12, color: 'var(--ad-muted)' }}>
                    {(l as AdminLogDto).ownerUsername ?? '—'}
                  </td>
                )}
                <td style={{ fontSize: 12 }}>{l.appName}</td>
                <td>
                  <div className="ad-truncate" style={{ maxWidth: 220 }} title={l.subject}>{l.subject}</div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--ad-muted)' }}>
                  <div className="ad-truncate" style={{ maxWidth: 180 }} title={l.recipients}>
                    {l.recipients}
                  </div>
                  {l.recipientCount > 1 && <span style={{ fontSize: 11 }}> ({l.recipientCount})</span>}
                </td>
                <td>
                  <span className={`ad-status-badge ad-status-${l.status}`}>{l.status}</span>
                  {l.errorMessage && (
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.errorMessage}>
                      {l.errorMessage}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--ad-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.sentAt)}</td>
                <td style={{ fontSize: 12, color: 'var(--ad-muted)' }}>
                  {l.durationMs != null ? `${l.durationMs}ms` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ad-pagination">
        <span>{total} total · page {page + 1} of {totalPages}</span>
        <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} />
        </button>
        <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevRight size={14} />
        </button>
      </div>
    </>
  );
}

// ── ServiceCard ───────────────────────────────────────────────────────────────
function ServiceCard({
  service, templates, isExpanded, onToggle, onEdit, onDelete,
  onRegenKey, onCopy, onTest, onIntegrate, onWebhooks, onAddTemplate, onEditTemplate, onDeleteTemplate,
}: {
  service: ServiceDto; templates?: TemplateDto[]; isExpanded: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void; onRegenKey: () => void;
  onCopy: (s: string) => void; onTest: () => void; onIntegrate: () => void; onWebhooks: () => void;
  onAddTemplate: () => void; onEditTemplate: (t: TemplateDto) => void; onDeleteTemplate: (tid: number) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="ad-scard">
      <div className="ad-scard-head" onClick={onToggle}>
        <div>
          <h3>{service.name}</h3>
          <div className="ad-scard-meta"><Mail size={11} />{service.senderEmail ?? <em>no sender set</em>}</div>
          {service.smtpServer && (
            <div className="ad-scard-meta" style={{ marginTop: 2 }}>
              <KeyRound size={11} />{service.smtpServer}:{service.smtpPort ?? 587} ({service.smtpEncryption ?? 'TLS'})
            </div>
          )}
          {service.imapEnabled && (
            <div className="ad-scard-meta" style={{ marginTop: 2 }}>
              <Inbox size={11} />IMAP listening {service.lastImapPollAt ? `(last poll ${fmtDate(service.lastImapPollAt)})` : '(pending)'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {service.imapEnabled && <span className="ad-badge on" style={{ fontSize: 10 }}>IMAP</span>}
          <span className={`ad-badge ${service.isActive ? 'on' : 'off'}`}>{service.isActive ? 'Active' : 'Off'}</span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>
      <div className="ad-key-row">
        <KeyRound size={12} />
        <span className="ad-key-val">{showKey ? service.apiKey : '●●●●●●●●●●●●●●●●●●●●'}</span>
        <button className="ad-icon-btn" onClick={() => setShowKey(k => !k)} title={showKey ? 'Hide' : 'Show'}>
          {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button className="ad-icon-btn" title="Copy key" onClick={() => onCopy(service.apiKey)}><Copy size={13} /></button>
        <button className="ad-icon-btn" title="Regenerate key" onClick={onRegenKey}><RefreshCcw size={13} /></button>
      </div>
      {isExpanded && (
        <div className="ad-tmpl-area">
          <h4>Templates</h4>
          <div className="ad-tmpl-list">
            {(templates ?? []).map(t => (
              <div key={t.id} className="ad-tmpl-item">
                <div className="ad-tmpl-info">
                  <div className="ad-tmpl-name">{t.name}</div>
                  <div className="ad-tmpl-subj">{t.subject}</div>
                </div>
                <button className="ad-icon-btn" onClick={() => onEditTemplate(t)}><Pencil size={13} /></button>
                <button className="ad-icon-btn" onClick={() => onDeleteTemplate(t.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button className="ad-add-chip" onClick={onAddTemplate}><Plus size={13} /> Add template</button>
        </div>
      )}
      <div className="ad-scard-actions">
        <button className="ad-btn ad-btn-ghost" onClick={onEdit}><Pencil size={12} /> Edit</button>
        <button className="ad-btn ad-btn-ghost" onClick={onTest}><Send size={12} /> Test</button>
        <button className="ad-btn ad-btn-ghost" onClick={onIntegrate}><Code2 size={12} /> Integrate</button>
        <button className="ad-btn ad-btn-ghost" onClick={onWebhooks}><Webhook size={12} /> Webhooks</button>
        <button className="ad-btn ad-btn-danger" onClick={onDelete}><Trash2 size={12} /> Deactivate</button>
      </div>
    </div>
  );
}

// ── ServiceModal ──────────────────────────────────────────────────────────────
function ServiceModal({ service, busy, isDark, onClose, onSave }: {
  service?: ServiceDto; busy: boolean; isDark: boolean; onClose: () => void;
  onSave: (data: {
    name: string; senderEmail: string; senderName: string;
    smtpUsername: string; smtpPassword: string; smtpServer: string; smtpPort: string; smtpEncryption: string;
    imapEnabled: boolean; imapServer: string; imapPort: string; imapUsername: string; imapPassword: string; imapUseSsl: boolean;
  }) => void;
}) {
  const [name,           setName]           = useState(service?.name           ?? '');
  const [senderEmail,    setSenderEmail]    = useState(service?.senderEmail    ?? '');
  const [senderName,     setSenderName]     = useState(service?.senderName     ?? '');
  const [smtpUsername,   setSmtpUsername]   = useState(service?.smtpUsername   ?? '');
  const [smtpPassword,   setSmtpPassword]   = useState('');
  const [smtpServer,     setSmtpServer]     = useState(service?.smtpServer     ?? '');
  const [smtpPort,       setSmtpPort]       = useState(service?.smtpPort?.toString() ?? '');
  const [smtpEncryption, setSmtpEncryption] = useState(service?.smtpEncryption ?? 'TLS');
  const [imapEnabled,    setImapEnabled]    = useState(service?.imapEnabled    ?? false);
  const [imapServer,     setImapServer]     = useState(service?.imapServer     ?? '');
  const [imapPort,       setImapPort]       = useState(service?.imapPort?.toString() ?? '993');
  const [imapUsername,   setImapUsername]   = useState(service?.imapUsername   ?? '');
  const [imapPassword,   setImapPassword]   = useState('');
  const [imapUseSsl,     setImapUseSsl]     = useState(service?.imapUseSsl      ?? true);
  const [showPass,       setShowPass]       = useState(false);
  const [showImapPass,   setShowImapPass]   = useState(false);

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 500 }}>
        <div className="ad-modal-head">
          <h3>{service ? 'Edit Service' : 'New Service'}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ad-field"><label>Service Name *</label>
          <input className="ad-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My App" /></div>
        <div className="ad-field"><label>Sender Email *</label>
          <input className="ad-input" type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="noreply@myapp.com" /></div>
        <div className="ad-field"><label>Sender Display Name</label>
          <input className="ad-input" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="My App Support" /></div>
        <div style={{ borderTop: '1px solid var(--ad-border)', margin: '12px 0 14px', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ad-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            SMTP Server <small style={{ textTransform: 'none', fontWeight: 400 }}>(leave blank to use global default)</small>
          </div>
          <div className="ad-field"><label>SMTP Server</label>
            <input className="ad-input" value={smtpServer} onChange={e => setSmtpServer(e.target.value)} placeholder="smtp.gmail.com" /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="ad-field" style={{ flex: 1 }}><label>SMTP Port</label>
              <input className="ad-input" type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" /></div>
            <div className="ad-field" style={{ flex: 1 }}><label>Encryption</label>
              <select className="ad-input" value={smtpEncryption} onChange={e => setSmtpEncryption(e.target.value)}>
                <option value="TLS">TLS (STARTTLS — port 587)</option>
                <option value="SSL">SSL (implicit — port 465)</option>
                <option value="None">None (port 25)</option>
              </select></div>
          </div>
          <div className="ad-field"><label>SMTP Username</label>
            <input className="ad-input" value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)} placeholder="same as sender email" /></div>
          <div className="ad-field">
            <label>SMTP Password {service && <small style={{ fontWeight: 400 }}>(blank = keep existing)</small>}</label>
            <div className="ad-input-wrap">
              <input className="ad-input" type={showPass ? 'text' : 'password'} value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder={service?.hasSmtpPassword ? '••••••••' : 'leave blank to use global'} />
              <button type="button" className="ad-eye" onClick={() => setShowPass(p => !p)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* IMAP inbound listening */}
        <div style={{ borderTop: '1px solid var(--ad-border)', margin: '12px 0 14px', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ad-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            Inbound Email (IMAP) <small style={{ textTransform: 'none', fontWeight: 400 }}>— listen for received emails</small>
          </div>
          <div className="ad-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="imapEnabledCb" checked={imapEnabled} onChange={e => setImapEnabled(e.target.checked)} style={{ width: 14, height: 14 }} />
            <label htmlFor="imapEnabledCb" style={{ marginBottom: 0, cursor: 'pointer' }}>Enable IMAP listening for this service</label>
          </div>
          {imapEnabled && (
            <>
              <div className="ad-field"><label>IMAP Server <small style={{ fontWeight: 400 }}>(hostname only — no http://, blank = auto from SMTP)</small></label>
                <input className="ad-input" value={imapServer} onChange={e => setImapServer(e.target.value)} placeholder="imappro.zoho.com" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="ad-field" style={{ flex: 1 }}><label>IMAP Port</label>
                  <input className="ad-input" type="number" value={imapPort} onChange={e => setImapPort(e.target.value)} placeholder="993" /></div>
                <div className="ad-field" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="imapSslCb" checked={imapUseSsl} onChange={e => setImapUseSsl(e.target.checked)} />
                  <label htmlFor="imapSslCb" style={{ marginBottom: 0 }}>Use SSL</label>
                </div>
              </div>
              <div className="ad-field"><label>IMAP Username <small style={{ fontWeight: 400 }}>(blank = use SMTP username)</small></label>
                <input className="ad-input" value={imapUsername} onChange={e => setImapUsername(e.target.value)} placeholder="info@yourdomain.com" /></div>
              <div className="ad-field">
                <label>IMAP Password {service && <small style={{ fontWeight: 400 }}>(blank = use SMTP password)</small>}</label>
                <div className="ad-input-wrap">
                  <input className="ad-input" type={showImapPass ? 'text' : 'password'} value={imapPassword} onChange={e => setImapPassword(e.target.value)} />
                  <button type="button" className="ad-eye" onClick={() => setShowImapPass(p => !p)}>
                    {showImapPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-primary" disabled={busy || !name.trim() || !senderEmail.trim()}
            onClick={() => onSave({
              name, senderEmail, senderName, smtpUsername, smtpPassword, smtpServer, smtpPort, smtpEncryption,
              imapEnabled, imapServer, imapPort, imapUsername, imapPassword, imapUseSsl,
            })}>
            {busy ? <Loader2 size={14} className="ad-spin" /> : null}
            {service ? 'Save Changes' : 'Create Service'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TemplateModal ─────────────────────────────────────────────────────────────
function TemplateModal({ template, busy, isDark, onClose, onSave }: {
  appId: number; template?: TemplateDto; busy: boolean; isDark: boolean; onClose: () => void;
  onSave: (data: { name: string; subject: string; body: string; isHtml: boolean }) => void;
}) {
  const [name,    setName]    = useState(template?.name    ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body,    setBody]    = useState(template?.body    ?? '');
  const [isHtml,  setIsHtml]  = useState(template?.isHtml  ?? true);
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 540 }}>
        <div className="ad-modal-head">
          <h3>{template ? 'Edit Template' : 'New Template'}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ad-field"><label>Template Name *</label>
          <input className="ad-input" value={name} onChange={e => setName(e.target.value)} placeholder="Welcome Email" /></div>
        <div className="ad-field"><label>Subject *</label>
          <input className="ad-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Welcome to {{company}}, {{name}}!" /></div>
        <div className="ad-field">
          <label>Body * <small style={{ fontWeight: 400 }}>Use {'{{placeholder}}'} tokens</small></label>
          <textarea ref={taRef} className="ad-input" value={body} onChange={e => setBody(e.target.value)} rows={6}
            style={{ resize: 'vertical', fontFamily: isHtml ? 'ui-monospace,monospace' : 'inherit', fontSize: 12 }}
            placeholder={isHtml ? '<p>Hi {{name}},</p>\n<p>Welcome!</p>' : 'Hi {{name}},\n\nWelcome!'} />
        </div>
        <div className="ad-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="isHtmlCb" checked={isHtml} onChange={e => setIsHtml(e.target.checked)} style={{ width: 14, height: 14 }} />
          <label htmlFor="isHtmlCb" style={{ marginBottom: 0, cursor: 'pointer' }}>HTML body</label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-primary" disabled={busy || !name.trim() || !subject.trim() || !body.trim()}
            onClick={() => onSave({ name, subject, body, isHtml })}>
            {busy ? <Loader2 size={14} className="ad-spin" /> : null}
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TestEmailModal ────────────────────────────────────────────────────────────
function TestEmailModal({ service, templates, apiBaseUrl, isDark, onClose }: {
  service: ServiceDto; templates: TemplateDto[]; apiBaseUrl: string; isDark: boolean; onClose: () => void;
}) {
  const [to,         setTo]         = useState('');
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [status,     setStatus]     = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [busy,       setBusy]       = useState(false);
  const selected = templates.find(t => t.id === templateId) ?? null;

  const send = async () => {
    if (!to.trim()) return;
    setBusy(true); setStatus(null);
    const subject = selected ? selected.subject : `Test email from "${service.name}"`;
    const body    = selected ? selected.body    : `<p>This is a test email from the <strong>${service.name}</strong> service.</p>`;
    const isHtml  = selected ? selected.isHtml : true;
    try {
      const res = await fetch(`${apiBaseUrl}/api/email/send-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': service.apiKey },
        body: JSON.stringify({ recipients: [to.trim()], subject, body, isHtml }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setStatus({ type: 'ok', msg: `Sent! ${data.message ?? ''}` });
      else        setStatus({ type: 'err', msg: data.error ?? `HTTP ${res.status}` });
    } catch (e) {
      setStatus({ type: 'err', msg: e instanceof Error ? e.message : 'Network error' });
    } finally { setBusy(false); }
  };

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 480 }}>
        <div className="ad-modal-head">
          <h3>Test Service — {service.name}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ad-muted)', marginBottom: 14 }}>
          Send a test email through this service to verify the SMTP settings.
        </p>
        <div className="ad-field"><label>Template (optional)</label>
          <select className="ad-input" value={templateId ?? ''} onChange={e => setTemplateId(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">— Custom test message —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="ad-field"><label>Send test to *</label>
          <input className="ad-input" type="email" value={to} onChange={e => setTo(e.target.value)}
            placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && send()} autoFocus />
        </div>
        {status && <div className={`ad-test-status ${status.type}`}>{status.msg}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Close</button>
          <button className="ad-btn ad-btn-primary" disabled={busy || !to.trim()} onClick={send}>
            {busy ? <Loader2 size={14} className="ad-spin" /> : <Send size={14} />} Send Test
          </button>
        </div>
      </div>
    </div>
  );
}

// ── IntegrateModal ────────────────────────────────────────────────────────────
function IntegrateModal({ service, templates, apiBaseUrl, isDark, onClose }: {
  service: ServiceDto; templates: TemplateDto[]; apiBaseUrl: string; isDark: boolean; onClose: () => void;
}) {
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const origin   = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const endpoint = `${origin}/api/email/send-ai`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label); setTimeout(() => setCopied(null), 1800);
  };

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button className="ad-icon-btn ad-copy-btn-abs" title="Copy" onClick={() => copy(text, label)} style={{ opacity: copied === label ? 1 : undefined }}>
      {copied === label ? <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>✓</span> : <Copy size={12} />}
    </button>
  );

  const requestJson = JSON.stringify({ recipient: 'user@example.com', subject: 'Hello', body: '<p>Email body here.</p>' }, null, 2);
  const firstId = templates.length > 0 ? templates[0].id : 1;
  const templateJson = templates.length > 0 ? JSON.stringify({ recipient: 'user@example.com', templateId: firstId }, null, 2) : null;

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 520 }}>
        <div className="ad-modal-head">
          <h3>Integrate — {service.name}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ad-section-label">API Endpoint</div>
        <div className="ad-copy-block">
          <div className="ad-code">{endpoint}</div>
          <CopyBtn text={endpoint} label="endpoint" />
        </div>
        <div className="ad-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Service API Key
          <button className="ad-icon-btn" style={{ marginLeft: 2 }} onClick={() => setKeyVisible(v => !v)}>
            {keyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <div className="ad-copy-block">
          <div className="ad-code" style={{ letterSpacing: keyVisible ? 'normal' : 2 }}>
            {keyVisible ? service.apiKey : '●'.repeat(Math.min(service.apiKey.length, 36))}
          </div>
          <CopyBtn text={service.apiKey} label="key" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--ad-muted)', margin: '6px 0 0' }}>
          Send key as <code style={{ background: 'var(--ad-input)', padding: '1px 5px', borderRadius: 4 }}>X-Api-Key</code> header or{' '}
          <code style={{ background: 'var(--ad-input)', padding: '1px 5px', borderRadius: 4 }}>"apiKey"</code> JSON field.
        </div>
        <div className="ad-section-label">Request Body (JSON)</div>
        <div className="ad-copy-block"><div className="ad-code">{requestJson}</div><CopyBtn text={requestJson} label="json" /></div>
        {templateJson && (
          <>
            <div className="ad-section-label">With Template</div>
            <div className="ad-copy-block"><div className="ad-code">{templateJson}</div><CopyBtn text={templateJson} label="tpl" /></div>
          </>
        )}
        {templates.length > 0 && (
          <>
            <div className="ad-section-label">Available Templates</div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--ad-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--ad-border)' }}>ID</th>
                  <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--ad-border)' }}>Name</th>
                  <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--ad-border)' }}>Subject</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#22c55e' }}>{t.id}</td>
                    <td style={{ padding: '4px 8px' }}>{t.name}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--ad-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="ad-section-label">Quick curl</div>
        <div className="ad-copy-block">
          <div className="ad-code">{`curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: ${keyVisible ? service.apiKey : '<your-api-key>'}" \\\n  -d '{"recipients":["you@example.com"],"subject":"Test","body":"Hello"}'`}</div>
          <CopyBtn text={`curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: ${service.apiKey}" \\\n  -d '{"recipients":["you@example.com"],"subject":"Test","body":"Hello"}'`} label="curl" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── AdminCreateServiceModal ───────────────────────────────────────────────────
function AdminCreateServiceModal({ isDark, users, onClose, onSave }: {
  isDark: boolean;
  users: AdminUserDto[];
  onClose: () => void;
  onSave: (data: {
    userId?: number; name: string; senderEmail: string; senderName?: string;
    smtpUsername?: string; smtpPassword?: string; smtpServer?: string;
    smtpPort?: number; smtpEncryption?: string; description?: string;
  }) => void;
}) {
  const [userId,         setUserId]         = useState<string>('');
  const [name,           setName]           = useState('');
  const [senderEmail,    setSenderEmail]    = useState('');
  const [senderName,     setSenderName]     = useState('');
  const [smtpServer,     setSmtpServer]     = useState('');
  const [smtpPort,       setSmtpPort]       = useState('');
  const [smtpEncryption, setSmtpEncryption] = useState('TLS');
  const [smtpUsername,   setSmtpUsername]   = useState('');
  const [smtpPassword,   setSmtpPassword]   = useState('');
  const [description,    setDescription]    = useState('');
  const [showPass,       setShowPass]       = useState(false);

  const handleSave = () => {
    onSave({
      userId: userId ? parseInt(userId) : undefined,
      name, senderEmail,
      senderName:    senderName    || undefined,
      smtpUsername:  smtpUsername  || undefined,
      smtpPassword:  smtpPassword  || undefined,
      smtpServer:    smtpServer    || undefined,
      smtpPort:      smtpPort ? parseInt(smtpPort) : undefined,
      smtpEncryption:smtpEncryption || undefined,
      description:   description   || undefined,
    });
  };

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 520 }}>
        <div className="ad-modal-head">
          <h3>Create Service (Admin)</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ad-field"><label>Assign to User (optional)</label>
          <select className="ad-input" value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— No owner (unassigned) —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} (#{u.id})</option>)}
          </select>
        </div>
        <div className="ad-field"><label>Service Name *</label>
          <input className="ad-input" value={name} onChange={e => setName(e.target.value)} placeholder="My App" /></div>
        <div className="ad-field"><label>Sender Email *</label>
          <input className="ad-input" type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="noreply@myapp.com" /></div>
        <div className="ad-field"><label>Sender Name</label>
          <input className="ad-input" value={senderName} onChange={e => setSenderName(e.target.value)} /></div>
        <div className="ad-field"><label>Description</label>
          <input className="ad-input" value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div style={{ borderTop: '1px solid var(--ad-border)', margin: '12px 0 14px', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ad-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            SMTP Override
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="ad-field" style={{ flex: 2 }}><label>SMTP Server</label>
              <input className="ad-input" value={smtpServer} onChange={e => setSmtpServer(e.target.value)} placeholder="smtp.gmail.com" /></div>
            <div className="ad-field" style={{ flex: 1 }}><label>Port</label>
              <input className="ad-input" type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" /></div>
            <div className="ad-field" style={{ flex: 1 }}><label>Encryption</label>
              <select className="ad-input" value={smtpEncryption} onChange={e => setSmtpEncryption(e.target.value)}>
                <option value="TLS">TLS</option><option value="SSL">SSL</option><option value="None">None</option>
              </select></div>
          </div>
          <div className="ad-field"><label>SMTP Username</label>
            <input className="ad-input" value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)} /></div>
          <div className="ad-field"><label>SMTP Password</label>
            <div className="ad-input-wrap">
              <input className="ad-input" type={showPass ? 'text' : 'password'} value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} />
              <button type="button" className="ad-eye" onClick={() => setShowPass(p => !p)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-primary" disabled={!name.trim() || !senderEmail.trim()} onClick={handleSave}>
            Create Service
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WebhooksModal ─────────────────────────────────────────────────────────────
function WebhooksModal({ service, api, isDark, onClose }: {
  service: ServiceDto;
  api: (method: string, path: string, body?: unknown) => Promise<unknown>;
  isDark: boolean;
  onClose: () => void;
}) {
  const [hooks, setHooks] = useState<WebhookDto[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('GET', `/api/account/services/${service.id}/webhooks`) as WebhookDto[];
      setHooks(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [api, service.id]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!url.trim()) return;
    setBusy(true); setErr(null);
    try {
      await api('POST', `/api/account/services/${service.id}/webhooks`, { url: url.trim() });
      setUrl(''); await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally { setBusy(false); }
  };

  const toggle = async (id: number, active: boolean) => {
    try {
      await api('PATCH', `/api/account/services/${service.id}/webhooks/${id}`, { isActive: active });
      await load();
    } catch { /* silent */ }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api('DELETE', `/api/account/services/${service.id}/webhooks/${id}`);
      await load();
    } catch { /* silent */ }
  };

  const copy = (t: string) => navigator.clipboard.writeText(t).catch(() => {});

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 560 }}>
        <div className="ad-modal-head">
          <h3>Webhooks — {service.name}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ad-muted)', marginBottom: 14 }}>
          External apps receive a POST notification when a new email arrives. Verify using the <code>X-Webhook-Signature</code> header (HMAC-SHA256).
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="ad-input" style={{ flex: 1 }} value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://your-app.com/webhooks/email-received" />
          <button className="ad-btn ad-btn-primary" disabled={busy || !url.trim()} onClick={add}>
            {busy ? <Loader2 size={14} className="ad-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
        {err && <div className="ad-alert err">{err}</div>}
        {loading ? <div className="ad-empty"><Loader2 size={20} className="ad-spin" /></div> : (
          <div className="ad-tmpl-list">
            {hooks.length === 0 && <div className="ad-empty">No webhooks yet.</div>}
            {hooks.map(h => (
              <div key={h.id} className="ad-tmpl-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={13} />
                  <span style={{ flex: 1, fontSize: 12, wordBreak: 'break-all' }}>{h.url}</span>
                  <span className={`ad-badge ${h.isActive ? 'on' : 'off'}`}>{h.isActive ? 'Active' : 'Off'}</span>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ad-muted)' }}>
                  Secret: {h.secret}
                  <button className="ad-icon-btn" style={{ marginLeft: 4 }} onClick={() => copy(h.secret)}><Copy size={11} /></button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => toggle(h.id, !h.isActive)}>
                    {h.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => remove(h.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="ad-section-label">External API (poll alternative)</div>
        <div className="ad-code" style={{ fontSize: 11 }}>
          {`GET /api/inbound/emails\nGET /api/inbound/unread-count\nHeader: X-Api-Key: ${service.apiKey.substring(0, 20)}...`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── InboundDetailModal ──────────────────────────────────────────────────────
function InboundDetailModal({ email, api, isDark, onClose, onMarkRead }: {
  email: InboundEmailDto;
  api: (method: string, path: string, body?: unknown) => Promise<unknown>;
  isDark: boolean;
  onClose: () => void;
  onMarkRead: (id: number) => void;
}) {
  const [detail, setDetail] = useState<InboundEmailDto & { bodyText?: string; bodyHtml?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('GET', `/api/account/inbound/emails/${email.id}`)
      .then((res: { bodyText?: string; bodyHtml?: string; from?: string; fromName?: string; to?: string; subject?: string; bodyPreview?: string; receivedAt?: string; isRead?: boolean; id?: number; appName?: string }) => {
        setDetail({
          ...email,
          bodyText: res.bodyText ?? undefined,
          bodyHtml: res.bodyHtml ?? undefined,
          fromAddress: res.from ?? email.fromAddress,
          toAddress: res.to ?? email.toAddress,
          subject: res.subject ?? email.subject,
        });
      })
      .catch(() => setDetail(email))
      .finally(() => setLoading(false));
  }, [api, email]);

  const d = detail ?? email;

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="ad-modal-head">
          <h3>{d.subject}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        {loading ? <div className="ad-empty"><Loader2 size={20} className="ad-spin" /></div> : (
          <>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <div><strong>From:</strong> {d.fromName ? `${d.fromName} <${d.fromAddress}>` : d.fromAddress}</div>
              <div><strong>To:</strong> {d.toAddress}</div>
              <div style={{ color: 'var(--ad-muted)' }}><strong>Service:</strong> {d.appName} · {fmtDate(d.receivedAt)}</div>
            </div>
            <div className="ad-code" style={{ maxHeight: 400, whiteSpace: 'pre-wrap' }}>
              {d.bodyText ?? d.bodyPreview ?? '(no body)'}
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          {!d.isRead && (
            <button className="ad-btn ad-btn-primary" onClick={() => onMarkRead(d.id)}>Mark as read</button>
          )}
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
