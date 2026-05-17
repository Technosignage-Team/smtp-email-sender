/**
 * AccountDashboard — user registration, login, services & templates management.
 * Self-contained: scoped CSS injected once, no global styles touched.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  User,
  X,
} from 'lucide-react';

// ── scoped CSS ────────────────────────────────────────────────────────────────
const CSS = `
.ad *,.ad *::before,.ad *::after{box-sizing:border-box;}
.ad{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;color:var(--ad-text);}
/* layout */
.ad-center{display:flex;flex-direction:column;align-items:center;padding:40px 16px;}
.ad-card{width:100%;max-width:440px;background:var(--ad-card);border:1px solid var(--ad-border);border-radius:16px;padding:28px 28px 24px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
.ad-card h2{font-size:1.25rem;font-weight:700;margin-bottom:4px;}
.ad-card p{color:var(--ad-muted);font-size:13px;margin-bottom:20px;}
/* tabs */
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
.ad-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:9px;border:none;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,opacity .15s;}
.ad-btn:disabled{opacity:.5;cursor:not-allowed;}
.ad-btn-primary{background:#6366f1;color:#fff;}
.ad-btn-primary:hover:not(:disabled){background:#4f46e5;}
.ad-btn-ghost{background:var(--ad-input);color:var(--ad-muted);border:1px solid var(--ad-border);}
.ad-btn-ghost:hover:not(:disabled){color:var(--ad-text);}
.ad-btn-danger{background:transparent;color:#ef4444;border:1px solid #fca5a5;}
.ad-btn-danger:hover:not(:disabled){background:#fef2f2;}
.ad-btn-full{width:100%;justify-content:center;margin-top:4px;}
/* alert */
.ad-alert{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;}
.ad-alert.err{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;}
.ad-alert.ok {background:#f0fdf4;color:#166534;border:1px solid #86efac;}
.ad-dark .ad-alert.err{background:#450a0a;color:#fca5a5;border-color:#7f1d1d;}
.ad-dark .ad-alert.ok {background:#052e16;color:#86efac;border-color:#064e3b;}
/* dashboard header */
.ad-dash{width:100%;max-width:900px;}
.ad-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:24px;}
.ad-header h2{font-size:1.2rem;font-weight:700;}
.ad-username{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ad-muted);}
/* service grid */
.ad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
/* service card */
.ad-scard{background:var(--ad-card);border:1px solid var(--ad-border);border-radius:14px;overflow:hidden;transition:box-shadow .15s;}
.ad-scard:hover{box-shadow:0 4px 16px rgba(99,102,241,.12);}
.ad-scard-head{padding:16px;border-bottom:1px solid var(--ad-border);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ad-scard-head h3{font-size:.95rem;font-weight:700;margin:0;}
.ad-scard-sender{font-size:12px;color:var(--ad-muted);display:flex;align-items:center;gap:4px;margin-top:2px;}
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
.ad-tmpl-area h4{font-size:12px;font-weight:700;color:var(--ad-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;}
.ad-tmpl-list{display:flex;flex-direction:column;gap:7px;}
.ad-tmpl-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--ad-input);border-radius:8px;border:1px solid var(--ad-border);}
.ad-tmpl-info{flex:1;min-width:0;}
.ad-tmpl-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ad-tmpl-subj{font-size:11px;color:var(--ad-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ad-add-chip{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:6px 12px;border-radius:8px;border:1px dashed var(--ad-border);color:var(--ad-muted);background:none;font:inherit;font-size:12px;cursor:pointer;transition:border-color .15s,color .15s;}
.ad-add-chip:hover{border-color:#6366f1;color:#6366f1;}
/* service actions bar */
.ad-scard-actions{padding:10px 16px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--ad-border);}
/* modal overlay */
.ad-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:9999;padding:16px;}
.ad-modal{background:var(--ad-card);border:1px solid var(--ad-border);border-radius:16px;padding:24px;width:100%;max-width:460px;box-shadow:0 8px 32px rgba(0,0,0,.18);}
.ad-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.ad-modal-head h3{font-size:1rem;font-weight:700;margin:0;}
/* spin */
@keyframes ad-spin{to{transform:rotate(360deg)}}
.ad-spin{animation:ad-spin .8s linear infinite;}
/* add service card */
.ad-add-card{background:var(--ad-card);border:2px dashed var(--ad-border);border-radius:14px;display:grid;place-items:center;min-height:140px;cursor:pointer;transition:border-color .15s,color .15s;color:var(--ad-muted);}
.ad-add-card:hover{border-color:#6366f1;color:#6366f1;}
`;

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserDto { id: number; username: string; email?: string; }
interface ServiceDto {
  id: number; name: string; apiKey: string;
  senderEmail: string | null; senderName: string | null;
  smtpUsername: string | null; hasSmtpPassword: boolean;
  isActive: boolean; createdAt: string;
}
interface TemplateDto {
  id: number; appId: number; name: string; subject: string; body: string; isHtml: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export interface AccountDashboardProps {
  apiBaseUrl: string;
  theme: 'light' | 'dark';
}

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

  const [token,    setToken]    = useState<string | null>(() => localStorage.getItem('acc_token'));
  const [user,     setUser]     = useState<UserDto | null>(null);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [templates, setTemplates] = useState<Record<number, TemplateDto[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy,     setBusy]     = useState(false);
  const [alert,    setAlert]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Login / register form state
  const [authTab,  setAuthTab]  = useState<'login' | 'register'>('login');
  const [formUser, setFormUser] = useState('');
  const [formPass, setFormPass] = useState('');
  const [formEmail,setFormEmail]= useState('');
  const [showPass, setShowPass] = useState(false);

  // Modals
  const [modal, setModal] = useState<
    | { type: 'service'; service?: ServiceDto }
    | { type: 'template'; appId: number; template?: TemplateDto }
    | null
  >(null);

  const base = apiBaseUrl;

  // ── API helpers ─────────────────────────────────────────────────────────────
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
    setAlert(null);
  }, []);

  // ── Verify token on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api('GET', '/api/account/me')
      .then((u: UserDto) => { setUser(u); loadServices(); })
      .catch(() => { localStorage.removeItem('acc_token'); setToken(null); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load services ───────────────────────────────────────────────────────────
  const loadServices = useCallback(async () => {
    try { setServices(await api('GET', '/api/account/services')); }
    catch { /* silent */ }
  }, [api]);

  // ── Load templates for a service ────────────────────────────────────────────
  const loadTemplates = useCallback(async (appId: number) => {
    if (templates[appId]) return;
    try {
      const t: TemplateDto[] = await api('GET', `/api/account/services/${appId}/templates`);
      setTemplates(prev => ({ ...prev, [appId]: t }));
    } catch { /* silent */ }
  }, [api, templates]);

  const toggleExpand = useCallback((id: number) => {
    setExpanded(prev => {
      if (prev === id) return null;
      loadTemplates(id);
      return id;
    });
  }, [loadTemplates]);

  // ── Auth submit ─────────────────────────────────────────────────────────────
  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null); setBusy(true);
    try {
      const body = authTab === 'login'
        ? { username: formUser, password: formPass }
        : { username: formUser, password: formPass, email: formEmail || undefined };
      const res = await api('POST', `/api/account/${authTab}`, body);
      saveToken(res.token);
      setUser(res.user);
      await loadServices();
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    } finally { setBusy(false); }
  }, [authTab, formUser, formPass, formEmail, api, saveToken, loadServices]);

  // ── Copy to clipboard ───────────────────────────────────────────────────────
  const copy = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

  // ── Service CRUD ─────────────────────────────────────────────────────────────
  const handleSaveService = useCallback(async (data: {
    name: string; senderEmail: string; senderName: string; smtpUsername: string; smtpPassword: string;
  }, editId?: number) => {
    setBusy(true); setAlert(null);
    try {
      if (editId) {
        const updated: ServiceDto = await api('PATCH', `/api/account/services/${editId}`, data);
        setServices(prev => prev.map(s => s.id === editId ? updated : s));
      } else {
        const created: ServiceDto = await api('POST', '/api/account/services', data);
        setServices(prev => [created, ...prev]);
      }
      setModal(null);
    } catch (err: unknown) {
      setAlert({ type: 'err', msg: err instanceof Error ? err.message : 'Error' });
    } finally { setBusy(false); }
  }, [api]);

  const handleDeleteService = useCallback(async (id: number) => {
    if (!confirm('Deactivate this service? It will remain visible but its API key will stop working.')) return;
    try {
      await api('DELETE', `/api/account/services/${id}`);
      // Backend sets IsActive=false — update UI to reflect that, don't remove the row
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

  // ── Template CRUD ─────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`ad${isDark ? ' ad-dark' : ''}`} style={cssVars}>

      {/* ── LOGIN / REGISTER ── */}
      {!user && (
        <div className="ad-center">
          <div className="ad-card">
            <h2>Account Management</h2>
            <p>Manage your email services and templates</p>
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
        <div className="ad-dash">
          <div className="ad-header">
            <h2>Account Management</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ad-username"><User size={13} />{user.username}</span>
              <button className="ad-btn ad-btn-ghost" onClick={logout}><LogOut size={13} /> Sign out</button>
            </div>
          </div>

          {alert && <div className={`ad-alert ${alert.type}`} style={{ marginBottom: 16 }}>{alert.msg}</div>}

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
                onAddTemplate={() => setModal({ type: 'template', appId: svc.id })}
                onEditTemplate={(t) => setModal({ type: 'template', appId: svc.id, template: t })}
                onDeleteTemplate={(tid) => handleDeleteTemplate(svc.id, tid)}
              />
            ))}

            {/* Add service card */}
            <div className="ad-add-card" onClick={() => setModal({ type: 'service' })}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Plus size={24} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Add Service</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {modal?.type === 'service' && (
        <ServiceModal
          service={modal.service}
          busy={busy}
          isDark={isDark}
          onClose={() => setModal(null)}
          onSave={(data) => handleSaveService(data, modal.service?.id)}
        />
      )}

      {modal?.type === 'template' && (
        <TemplateModal
          appId={modal.appId}
          template={modal.template}
          busy={busy}
          isDark={isDark}
          onClose={() => setModal(null)}
          onSave={(data) => handleSaveTemplate(modal.appId, data, modal.template?.id)}
        />
      )}
    </div>
  );
}

// ── ServiceCard ───────────────────────────────────────────────────────────────
function ServiceCard({
  service, templates, isExpanded, onToggle, onEdit, onDelete,
  onRegenKey, onCopy, onAddTemplate, onEditTemplate, onDeleteTemplate,
}: {
  service: ServiceDto;
  templates?: TemplateDto[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRegenKey: () => void;
  onCopy: (s: string) => void;
  onAddTemplate: () => void;
  onEditTemplate: (t: TemplateDto) => void;
  onDeleteTemplate: (tid: number) => void;
}) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="ad-scard">
      <div className="ad-scard-head" onClick={onToggle}>
        <div>
          <h3>{service.name}</h3>
          <div className="ad-scard-sender">
            <Mail size={11} />
            {service.senderEmail ?? <em>no sender set</em>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`ad-badge ${service.isActive ? 'on' : 'off'}`}>
            {service.isActive ? 'Active' : 'Off'}
          </span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {/* API key row */}
      <div className="ad-key-row">
        <KeyRound size={12} />
        <span className="ad-key-val">
          {showKey ? service.apiKey : '●●●●●●●●●●●●●●●●●●●●'}
        </span>
        <button className="ad-icon-btn" title={showKey ? 'Hide' : 'Show'} onClick={() => setShowKey(k => !k)}>
          {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button className="ad-icon-btn" title="Copy key" onClick={() => onCopy(service.apiKey)}>
          <Copy size={13} />
        </button>
        <button className="ad-icon-btn" title="Regenerate key" onClick={onRegenKey}>
          <RefreshCcw size={13} />
        </button>
      </div>

      {/* Templates (expanded) */}
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
                <button className="ad-icon-btn" title="Edit" onClick={() => onEditTemplate(t)}><Pencil size={13} /></button>
                <button className="ad-icon-btn" title="Delete" onClick={() => onDeleteTemplate(t.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button className="ad-add-chip" onClick={onAddTemplate}><Plus size={13} /> Add template</button>
        </div>
      )}

      {/* Action buttons */}
      <div className="ad-scard-actions">
        <button className="ad-btn ad-btn-ghost" onClick={onEdit}><Pencil size={12} /> Edit</button>
        <button className="ad-btn ad-btn-danger" onClick={onDelete}><Trash2 size={12} /> Deactivate</button>
      </div>
    </div>
  );
}

// ── ServiceModal ──────────────────────────────────────────────────────────────
function ServiceModal({ service, busy, isDark, onClose, onSave }: {
  service?: ServiceDto;
  busy: boolean;
  isDark: boolean;
  onClose: () => void;
  onSave: (data: { name: string; senderEmail: string; senderName: string; smtpUsername: string; smtpPassword: string }) => void;
}) {
  const [name,         setName]         = useState(service?.name         ?? '');
  const [senderEmail,  setSenderEmail]  = useState(service?.senderEmail  ?? '');
  const [senderName,   setSenderName]   = useState(service?.senderName   ?? '');
  const [smtpUsername, setSmtpUsername] = useState(service?.smtpUsername ?? '');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showPass,     setShowPass]     = useState(false);

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`}>
        <div className="ad-modal-head">
          <h3>{service ? 'Edit Service' : 'New Service'}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ad-field">
          <label>Service Name *</label>
          <input className="ad-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Heelovo" />
        </div>
        <div className="ad-field">
          <label>Sender Email * <small style={{ fontWeight: 400 }}>(From address)</small></label>
          <input className="ad-input" type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="info@heelvo.com" />
        </div>
        <div className="ad-field">
          <label>Sender Display Name</label>
          <input className="ad-input" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Heelovo Support" />
        </div>
        <div className="ad-field">
          <label>SMTP Username <small style={{ fontWeight: 400 }}>(leave blank to use global)</small></label>
          <input className="ad-input" value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)} placeholder="same as sender email" />
        </div>
        <div className="ad-field">
          <label>SMTP Password {service && <small style={{ fontWeight: 400 }}>(blank = keep existing)</small>}</label>
          <div className="ad-input-wrap">
            <input className="ad-input" type={showPass ? 'text' : 'password'} value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder={service?.hasSmtpPassword ? '••••••••' : 'leave blank to use global'} />
            <button type="button" className="ad-eye" onClick={() => setShowPass(p => !p)}>
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="ad-btn ad-btn-primary"
            disabled={busy || !name.trim() || !senderEmail.trim()}
            onClick={() => onSave({ name, senderEmail, senderName, smtpUsername, smtpPassword })}
          >
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
  appId: number;
  template?: TemplateDto;
  busy: boolean;
  isDark: boolean;
  onClose: () => void;
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

        <div className="ad-field">
          <label>Template Name *</label>
          <input className="ad-input" value={name} onChange={e => setName(e.target.value)} placeholder="Welcome Email" />
        </div>
        <div className="ad-field">
          <label>Subject *</label>
          <input className="ad-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Welcome to {{company}}, {{name}}!" />
        </div>
        <div className="ad-field">
          <label>Body * <small style={{ fontWeight: 400 }}>Use {'{{placeholder}}'} tokens</small></label>
          <textarea
            ref={taRef}
            className="ad-input"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            style={{ resize: 'vertical', fontFamily: isHtml ? 'ui-monospace,monospace' : 'inherit', fontSize: 12 }}
            placeholder={isHtml ? '<p>Hi {{name}},</p>\n<p>Welcome!</p>' : 'Hi {{name}},\n\nWelcome!'}
          />
        </div>
        <div className="ad-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="isHtmlCb" checked={isHtml} onChange={e => setIsHtml(e.target.checked)} style={{ width: 14, height: 14 }} />
          <label htmlFor="isHtmlCb" style={{ marginBottom: 0, cursor: 'pointer' }}>HTML body</label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="ad-btn ad-btn-primary"
            disabled={busy || !name.trim() || !subject.trim() || !body.trim()}
            onClick={() => onSave({ name, subject, body, isHtml })}
          >
            {busy ? <Loader2 size={14} className="ad-spin" /> : null}
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
