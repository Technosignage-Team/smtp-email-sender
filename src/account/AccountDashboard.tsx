/**
 * AccountDashboard — user registration, login, services & templates management.
 * Self-contained: scoped CSS injected once, no global styles touched.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Code2,
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
  Send,
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
  smtpServer: string | null; smtpPort: number | null; smtpEncryption: string | null;
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
    | { type: 'test'; service: ServiceDto }
    | { type: 'integrate'; service: ServiceDto }
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
    name: string; senderEmail: string; senderName: string;
    smtpUsername: string; smtpPassword: string;
    smtpServer: string; smtpPort: string; smtpEncryption: string;
  }, editId?: number) => {
    setBusy(true); setAlert(null);
    const payload = {
      name:          data.name,
      senderEmail:   data.senderEmail,
      senderName:    data.senderName   || undefined,
      smtpUsername:  data.smtpUsername || undefined,
      smtpPassword:  data.smtpPassword || undefined,
      smtpServer:    data.smtpServer   || undefined,
      smtpPort:      data.smtpPort ? parseInt(data.smtpPort) : undefined,
      smtpEncryption: data.smtpEncryption || undefined,
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
                onTest={() => { loadTemplates(svc.id); setModal({ type: 'test', service: svc }); }}
                onIntegrate={() => { loadTemplates(svc.id); setModal({ type: 'integrate', service: svc }); }}
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

      {modal?.type === 'test' && (
        <TestEmailModal
          service={modal.service}
          templates={templates[modal.service.id] ?? []}
          apiBaseUrl={base}
          isDark={isDark}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'integrate' && (
        <IntegrateModal
          service={modal.service}
          templates={templates[modal.service.id] ?? []}
          apiBaseUrl={base}
          isDark={isDark}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── ServiceCard ───────────────────────────────────────────────────────────────
function ServiceCard({
  service, templates, isExpanded, onToggle, onEdit, onDelete,
  onRegenKey, onCopy, onTest, onIntegrate, onAddTemplate, onEditTemplate, onDeleteTemplate,
}: {
  service: ServiceDto;
  templates?: TemplateDto[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRegenKey: () => void;
  onCopy: (s: string) => void;
  onTest: () => void;
  onIntegrate: () => void;
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
          {service.smtpServer && (
            <div className="ad-scard-sender" style={{ marginTop: 2 }}>
              <KeyRound size={11} />
              {service.smtpServer}:{service.smtpPort ?? '587'} ({service.smtpEncryption ?? 'TLS'})
            </div>
          )}
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
        <button className="ad-btn ad-btn-ghost" title="Send a test email to verify SMTP" onClick={onTest}><Send size={12} /> Test</button>
        <button className="ad-btn ad-btn-ghost" title="Get integration config for Google AI Studio" onClick={onIntegrate}><Code2 size={12} /> Integrate</button>
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
  onSave: (data: {
    name: string; senderEmail: string; senderName: string;
    smtpUsername: string; smtpPassword: string;
    smtpServer: string; smtpPort: string; smtpEncryption: string;
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
  const [showPass,       setShowPass]       = useState(false);

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
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

        {/* SMTP Server section */}
        <div style={{ borderTop: `1px solid var(--ad-border)`, margin: '12px 0 14px', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ad-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            SMTP Server <small style={{ textTransform: 'none', fontWeight: 400 }}>(leave blank to use global default)</small>
          </div>
          <div className="ad-field">
            <label>SMTP Server</label>
            <input className="ad-input" value={smtpServer} onChange={e => setSmtpServer(e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="ad-field" style={{ flex: 1 }}>
              <label>SMTP Port</label>
              <input className="ad-input" type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" />
            </div>
            <div className="ad-field" style={{ flex: 1 }}>
              <label>Encryption</label>
              <select className="ad-input" value={smtpEncryption} onChange={e => setSmtpEncryption(e.target.value)}>
                <option value="TLS">TLS (STARTTLS — port 587)</option>
                <option value="SSL">SSL (implicit — port 465)</option>
                <option value="None">None (port 25)</option>
              </select>
            </div>
          </div>
          <div className="ad-field">
            <label>SMTP Username</label>
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
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="ad-btn ad-btn-primary"
            disabled={busy || !name.trim() || !senderEmail.trim()}
            onClick={() => onSave({ name, senderEmail, senderName, smtpUsername, smtpPassword, smtpServer, smtpPort, smtpEncryption })}
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

// ── TestEmailModal ────────────────────────────────────────────────────────────
function TestEmailModal({ service, templates, apiBaseUrl, isDark, onClose }: {
  service: ServiceDto;
  templates: TemplateDto[];
  apiBaseUrl: string;
  isDark: boolean;
  onClose: () => void;
}) {
  const [to,         setTo]         = useState('');
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [status,     setStatus]     = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [busy,       setBusy]       = useState(false);

  const selected = templates.find(t => t.id === templateId) ?? null;

  const send = async () => {
    if (!to.trim()) return;
    setBusy(true); setStatus(null);
    const subject = selected
      ? selected.subject
      : `Test email from "${service.name}"`;
    const body = selected
      ? selected.body
      : `<p>This is a test email sent from the <strong>${service.name}</strong> service.</p><p>SMTP: ${service.smtpServer ?? 'global default'}:${service.smtpPort ?? 587} (${service.smtpEncryption ?? 'TLS'})</p>`;
    const isHtml = selected ? selected.isHtml : true;
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
          Send a test email through this service to verify the SMTP settings work.
        </p>

        <div className="ad-field">
          <label>Template to use</label>
          <select
            className="ad-input"
            value={templateId ?? ''}
            onChange={e => setTemplateId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">— Custom test message —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {selected && (
          <div style={{
            marginBottom: 12, padding: '10px 12px',
            background: 'var(--ad-bg2)', borderRadius: 6, fontSize: 12,
            border: '1px solid var(--ad-border)',
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--ad-muted)' }}>Subject: </span>
              <strong>{selected.subject}</strong>
            </div>
            <div style={{ color: 'var(--ad-muted)', maxHeight: 56, overflow: 'hidden', lineHeight: 1.5 }}>
              {selected.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 220)}
            </div>
          </div>
        )}

        <div className="ad-field">
          <label>Send test to (email address)</label>
          <input
            className="ad-input"
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="you@example.com"
            onKeyDown={e => e.key === 'Enter' && send()}
            autoFocus
          />
        </div>

        {status && (
          <div className={`ad-test-status ${status.type}`}>{status.msg}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Close</button>
          <button
            className="ad-btn ad-btn-primary"
            disabled={busy || !to.trim()}
            onClick={send}
          >
            {busy ? <Loader2 size={14} className="ad-spin" /> : <Send size={14} />}
            Send Test
          </button>
        </div>
      </div>
    </div>
  );
}

// ── IntegrateModal ────────────────────────────────────────────────────────────
function IntegrateModal({ service, templates, apiBaseUrl, isDark, onClose }: {
  service: ServiceDto;
  templates: TemplateDto[];
  apiBaseUrl: string;
  isDark: boolean;
  onClose: () => void;
}) {
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  const generateDoc = (ep: string) => {
    const tplRows = templates.length > 0
      ? templates.map(t => `| ${t.id} | ${t.name} | ${t.subject} |`).join('\n')
      : '| — | No templates yet | — |';
    const firstId = templates.length > 0 ? templates[0].id : 1;

    return [
      `# Email API — Integration Guide`,
      `## Service: ${service.name}`,
      ``,
      `---`,
      ``,
      `## Endpoint`,
      ``,
      `\`\`\``,
      `POST ${ep}`,
      `Content-Type: application/json`,
      `\`\`\``,
      ``,
      `---`,
      ``,
      `## Authentication`,
      ``,
      `Send your API key using **one** of these methods:`,
      ``,
      `| Method | How |`,
      `|--------|-----|`,
      `| HTTP header | \`X-Api-Key: <your-key>\` |`,
      `| JSON body field | \`"apiKey": "<your-key>"\` or \`"api_key": "<your-key>"\` |`,
      ``,
      `**Your API Key:** \`${service.apiKey}\``,
      ``,
      `---`,
      ``,
      `## Request Body — All Accepted Fields`,
      ``,
      `### Authentication`,
      `| Field | Alias | Type | Description |`,
      `|-------|-------|------|-------------|`,
      `| \`apiKey\` | \`api_key\` | string | Service API key. Alternative to \`X-Api-Key\` header. |`,
      ``,
      `### Recipients`,
      `| Field | Type | Description |`,
      `|-------|------|-------------|`,
      `| \`recipient\` | string | Single recipient email address. |`,
      `| \`recipients\` | string[] | Array of recipient email addresses. |`,
      `| \`to\` | string | Alias for \`recipient\`. |`,
      `| \`email\` | string | Alias for \`recipient\`. |`,
      `| \`recipientEmail\` / \`recipient_email\` | string | Alias for \`recipient\`. |`,
      ``,
      `> **Priority** when multiple are provided: \`recipients\` → \`recipient\` → \`to\` → \`email\` → \`recipientEmail\``,
      ``,
      `### Email Content`,
      `| Field | Type | Default | Description |`,
      `|-------|------|---------|-------------|`,
      `| \`subject\` | string | *(from template)* | Email subject line. Overrides template subject if both provided. |`,
      `| \`body\` | string | *(from template)* | Email body — HTML or plain text. |`,
      `| \`isHtml\` | boolean | \`true\` | Set to \`false\` if body is plain text. |`,
      ``,
      `### Templates`,
      `| Field | Alias | Type | Description |`,
      `|-------|-------|------|-------------|`,
      `| \`templateId\` | \`template_id\` | number \\| string | Template ID (\`3\`, \`"3"\`) or template name (\`"Welcome Email"\`). |`,
      `| \`templateName\` | \`template_name\` | string | Template name lookup. Alternative to \`templateId\`. |`,
      ``,
      `> When a template is used, its \`subject\`, \`body\`, and \`isHtml\` are applied automatically.`,
      `> You can still override \`subject\` per-request by including it in the JSON body.`,
      ``,
      `---`,
      ``,
      `## Available Templates`,
      ``,
      `| ID | Name | Subject |`,
      `|----|------|---------|`,
      tplRows,
      ``,
      `---`,
      ``,
      `## Request Examples`,
      ``,
      `### 1 — Custom email (no template)`,
      `\`\`\`json`,
      `{`,
      `  "recipient": "user@example.com",`,
      `  "subject": "Hello from ${service.name}",`,
      `  "body": "<p>This is a test email.</p>",`,
      `  "isHtml": true`,
      `}`,
      `\`\`\``,
      ``,
      `### 2 — Send using a template`,
      `\`\`\`json`,
      `{`,
      `  "apiKey": "${service.apiKey}",`,
      `  "recipient": "user@example.com",`,
      `  "templateId": ${firstId}`,
      `}`,
      `\`\`\``,
      ``,
      `### 3 — Template with subject override`,
      `\`\`\`json`,
      `{`,
      `  "apiKey": "${service.apiKey}",`,
      `  "recipient": "user@example.com",`,
      `  "templateId": ${firstId},`,
      `  "subject": "Custom subject for this send"`,
      `}`,
      `\`\`\``,
      ``,
      `### 4 — Multiple recipients`,
      `\`\`\`json`,
      `{`,
      `  "apiKey": "${service.apiKey}",`,
      `  "recipients": ["alice@example.com", "bob@example.com"],`,
      `  "templateId": ${firstId}`,
      `}`,
      `\`\`\``,
      ``,
      `### 5 — Snake_case field names (also accepted)`,
      `\`\`\`json`,
      `{`,
      `  "api_key": "${service.apiKey}",`,
      `  "recipient_email": "user@example.com",`,
      `  "template_id": ${firstId}`,
      `}`,
      `\`\`\``,
      ``,
      `---`,
      ``,
      `## Code Examples`,
      ``,
      `### JavaScript / fetch`,
      `\`\`\`js`,
      `const res = await fetch('${ep}', {`,
      `  method: 'POST',`,
      `  headers: {`,
      `    'Content-Type': 'application/json',`,
      `    'X-Api-Key': '${service.apiKey}'`,
      `  },`,
      `  body: JSON.stringify({`,
      `    recipient: 'user@example.com',`,
      `    templateId: ${firstId}`,
      `  })`,
      `});`,
      `const data = await res.json();`,
      `console.log(data);`,
      `\`\`\``,
      ``,
      `### Python / requests`,
      `\`\`\`python`,
      `import requests`,
      ``,
      `response = requests.post(`,
      `    '${ep}',`,
      `    headers={'X-Api-Key': '${service.apiKey}'},`,
      `    json={`,
      `        'recipient': 'user@example.com',`,
      `        'templateId': ${firstId}`,
      `    }`,
      `)`,
      `print(response.json())`,
      `\`\`\``,
      ``,
      `### curl`,
      `\`\`\`bash`,
      `curl -X POST "${ep}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -H "X-Api-Key: ${service.apiKey}" \\`,
      `  -d '{"recipient":"user@example.com","templateId":${firstId}}'`,
      `\`\`\``,
      ``,
      `---`,
      ``,
      `## Response Format`,
      ``,
      `### Success (HTTP 200)`,
      `\`\`\`json`,
      `{`,
      `  "success": true,`,
      `  "message": "Email sent successfully",`,
      `  "recipientCount": 1,`,
      `  "appName": "${service.name}",`,
      `  "templateUsed": "Template Name or null",`,
      `  "fieldHints": null`,
      `}`,
      `\`\`\``,
      ``,
      `### Error (HTTP 400 / 401 / 500)`,
      `\`\`\`json`,
      `{`,
      `  "success": false,`,
      `  "error": "Description of what went wrong",`,
      `  "fieldHints": {`,
      `    "api_key": "apiKey",`,
      `    "template_id": "templateId"`,
      `  }`,
      `}`,
      `\`\`\``,
      ``,
      `> **\`fieldHints\`** — when you use a non-canonical field name (e.g. \`api_key\` instead of \`apiKey\`),`,
      `> the response includes \`fieldHints\` mapping each alias to its preferred canonical name.`,
      `> Both forms always work; this is only a hint to help you standardise your integration.`,
      ``,
      `---`,
      ``,
      `*Generated by Email Sender — ${new Date().toLocaleDateString()}*`,
    ].join('\n');
  };

  const downloadDoc = () => {
    const content = generateDoc(endpoint);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${service.name.replace(/[^a-z0-9]/gi, '_')}_api_docs.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const endpoint = `${origin}/api/email/send-ai`;

  // Minimal: only endpoint + key required — everything else is flexible
  const requestJson = JSON.stringify({
    recipient: 'user@example.com',   // or "recipients": ["a@b.com","c@d.com"]
    subject: 'Hello',
    body: '<p>Email body here.</p>',
  }, null, 2);

  const templateJson = templates.length > 0
    ? JSON.stringify({
        recipient: 'user@example.com',
        templateId: templates[0].id,   // number OR "name" both work
      }, null, 2)
    : null;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  };

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button
      className="ad-icon-btn ad-copy-btn-abs"
      title="Copy"
      onClick={() => copy(text, label)}
      style={{ opacity: copied === label ? 1 : undefined }}
    >
      {copied === label
        ? <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>✓</span>
        : <Copy size={12} />}
    </button>
  );

  return (
    <div className="ad-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ad-modal${isDark ? ' ad-dark' : ''}`} style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="ad-modal-head">
          <h3>Integrate — {service.name}</h3>
          <button className="ad-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--ad-muted)', margin: '0 0 4px' }}>
          Give these values to Google AI Studio (or any app) to send emails using this service.
        </p>

        {/* Endpoint */}
        <div className="ad-section-label">API Endpoint</div>
        <div className="ad-copy-block">
          <div className="ad-code">{endpoint}</div>
          <CopyBtn text={endpoint} label="endpoint" />
        </div>

        {/* API Key */}
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

        {/* Auth instruction */}
        <div style={{ fontSize: 12, color: 'var(--ad-muted)', margin: '6px 0 0' }}>
          Send the key as HTTP header: <code style={{ background: 'var(--ad-input)', padding: '1px 5px', borderRadius: 4 }}>X-Api-Key: &lt;key&gt;</code>
          {' '}or as <code style={{ background: 'var(--ad-input)', padding: '1px 5px', borderRadius: 4 }}>"apiKey"</code> field in the JSON body.
        </div>

        {/* Accepted field names reference */}
        <div style={{ fontSize: 12, background: 'var(--ad-input)', borderRadius: 6, padding: '10px 12px', marginTop: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Accepted JSON fields</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {[
                ['recipient / recipients / to / email', 'Recipient address(es)'],
                ['subject', 'Email subject line'],
                ['body', 'Email body (HTML or plain text)'],
                ['isHtml', 'true / false  (default: true)'],
                ['templateId', 'Template ID (number or "5") or template name'],
                ['apiKey', 'Service key (alternative to X-Api-Key header)'],
              ].map(([field, desc]) => (
                <tr key={field}>
                  <td style={{ paddingRight: 12, paddingBottom: 3, fontFamily: 'monospace', color: '#22c55e', whiteSpace: 'nowrap' }}>{field}</td>
                  <td style={{ paddingBottom: 3, color: 'var(--ad-muted)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Request JSON — custom */}
        <div className="ad-section-label">Request Body — Custom (JSON)</div>
        <div className="ad-copy-block">
          <div className="ad-code">{requestJson}</div>
          <CopyBtn text={requestJson} label="json" />
        </div>

        {/* Request JSON — template */}
        {templateJson && (
          <>
            <div className="ad-section-label">Request Body — Use a Template (JSON)</div>
            <p style={{ fontSize: 12, color: 'var(--ad-muted)', margin: '0 0 4px' }}>
              Pass <code style={{ background: 'var(--ad-input)', padding: '1px 4px', borderRadius: 4 }}>templateId</code> to
              use a saved template. Subject &amp; body come from the template; you can optionally override{' '}
              <code style={{ background: 'var(--ad-input)', padding: '1px 4px', borderRadius: 4 }}>subject</code> per-send.
            </p>
            <div className="ad-copy-block">
              <div className="ad-code">{templateJson}</div>
              <CopyBtn text={templateJson} label="tpljson" />
            </div>
          </>
        )}

        {/* Templates table */}
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
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#22c55e' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {t.id}
                        <button
                          className="ad-icon-btn"
                          title="Copy ID"
                          onClick={() => copy(String(t.id), `tid-${t.id}`)}
                          style={{ opacity: copied === `tid-${t.id}` ? 1 : 0.5, padding: '0 2px' }}
                        >
                          {copied === `tid-${t.id}` ? <span style={{ fontSize: 9, color: '#22c55e' }}>✓</span> : <Copy size={10} />}
                        </button>
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px' }}>{t.name}</td>
                    <td style={{ padding: '4px 8px', color: 'var(--ad-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {templates.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--ad-muted)', marginTop: 8 }}>
            No templates yet — create one in this service to use <code style={{ background: 'var(--ad-input)', padding: '1px 4px', borderRadius: 4 }}>templateId</code>.
          </p>
        )}

        {/* SMTP info */}
        {service.smtpServer && (
          <>
            <div className="ad-section-label">SMTP (used by this service)</div>
            <div className="ad-code" style={{ fontSize: 12 }}>
              {`Server : ${service.smtpServer}\nPort   : ${service.smtpPort ?? 587}\nEnc.   : ${service.smtpEncryption ?? 'TLS'}\nFrom   : ${service.senderEmail ?? '—'}`}
            </div>
          </>
        )}

        {/* Quick curl example */}
        <div className="ad-section-label">Quick Test (curl)</div>
        <div className="ad-copy-block">
          <div className="ad-code">{`curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: ${keyVisible ? service.apiKey : '<your-api-key>'}" \\
  -d '{"recipients":["you@example.com"],"subject":"Test","body":"Hello","isHtml":false}'`}</div>
          <CopyBtn
            text={`curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: ${service.apiKey}" \\\n  -d '{"recipients":["you@example.com"],"subject":"Test","body":"Hello","isHtml":false}'`}
            label="curl"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="ad-btn ad-btn-ghost" onClick={downloadDoc} title="Download full API documentation as a Markdown file">⬇ Download Docs</button>
          <button className="ad-btn ad-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
