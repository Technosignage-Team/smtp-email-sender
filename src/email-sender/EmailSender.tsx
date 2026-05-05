/**
 * EmailSender — a self-contained, drop-in React module.
 *
 * Why this is "drop-in":
 *  - All styles are scoped under a unique `.es-root` class and injected once
 *    via a <style> tag. No Tailwind, no global CSS, no className collisions.
 *  - Only React + lucide-react icons are required. Pass `apiBaseUrl` to point
 *    the module at your backend (the EmailSenderApp .NET API by default).
 *
 * Backend contract (POST {apiBaseUrl}/api/email/send, multipart/form-data):
 *   - Subject:    string (required)
 *   - Body:       string (required, HTML by default)
 *   - Recipients: string (comma/semicolon separated; optional → fallback ToEmail)
 *   - IsHtml:     "true" | "false"
 *   - Attachments: File[] (zero or more)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  Bold,
  CheckCircle2,
  Eraser,
  FileText,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  Quote,
  Redo2,
  Send,
  Sparkles,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Users,
  X,
} from 'lucide-react';

// ---------- Public types ----------

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  /** Body in HTML or plain text. Use {{placeholder}} tokens. */
  body: string;
  /** Whether the body should be treated as HTML. Defaults to true. */
  isHtml?: boolean;
  /** Optional preview description shown in the picker. */
  description?: string;
}

export interface EmailSenderResult {
  message: string;
  recipientCount: number;
  attachmentCount: number;
}

export interface EmailSenderProps {
  /** Base URL of the EmailSenderApp .NET API (no trailing slash). */
  apiBaseUrl?: string;
  /**
   * API key issued to the calling application by the EmailSender admin.
   * Sent as the `X-Api-Key` header on every send. Required by the backend.
   */
  apiKey?: string;
  /** Pre-filled recipients (chips). */
  defaultRecipients?: string[];
  /** Default subject. */
  defaultSubject?: string;
  /** Default body. */
  defaultBody?: string;
  /** Force a recipient mode; if omitted, the user picks. */
  recipientMode?: 'single' | 'multiple';
  /** Show the recipient mode toggle. Defaults to true. */
  allowRecipientModeToggle?: boolean;
  /** Available templates for the template picker. */
  templates?: EmailTemplate[];
  /** Allow attachments. Defaults to true. */
  allowAttachments?: boolean;
  /** Max total attachment size in bytes. Defaults to 25 MB. */
  maxAttachmentBytes?: number;
  /** Card title. Defaults to "Send Email". */
  title?: string;
  /** Card subtitle. */
  subtitle?: string;
  /** Accent color (CSS color). Defaults to indigo. */
  accentColor?: string;
  /** Visual theme. */
  theme?: 'light' | 'dark';
  /** Reset the form after a successful send. Defaults to true. */
  resetOnSuccess?: boolean;
  /** Called after a successful send. */
  onSuccess?: (result: EmailSenderResult) => void;
  /** Called on send failure. */
  onError?: (error: Error) => void;
}

// ---------- Constants ----------

const DEFAULT_API_BASE = '';
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STYLE_TAG_ID = 'email-sender-module-styles';

// ---------- Helpers ----------

function classes(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function applyTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`,
  );
}

function extractPlaceholders(...sources: string[]): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
  for (const src of sources) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) found.add(m[1]);
  }
  return Array.from(found);
}

// ---------- Scoped styles (injected once) ----------

const STYLES = `
.es-root, .es-root * { box-sizing: border-box; }
.es-root {
  --es-bg: #ffffff;
  --es-fg: #18181b;
  --es-muted: #71717a;
  --es-border: #e4e4e7;
  --es-input-bg: #ffffff;
  --es-input-bg-focus: #ffffff;
  --es-chip-bg: #f4f4f5;
  --es-chip-fg: #27272a;
  --es-card-bg: #ffffff;
  --es-shadow: 0 10px 40px -10px rgba(0,0,0,0.15), 0 2px 6px -2px rgba(0,0,0,0.05);
  --es-accent: #6366f1;
  --es-accent-fg: #ffffff;
  --es-accent-soft: rgba(99,102,241,0.08);
  --es-success: #10b981;
  --es-error: #ef4444;
  --es-radius: 16px;
  --es-radius-sm: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
               Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 14px;
  line-height: 1.5;
  color: var(--es-fg);
  width: 100%;
  max-width: 560px;
}
.es-root.es-theme-dark {
  --es-bg: #0a0a0a;
  --es-fg: #fafafa;
  --es-muted: #a1a1aa;
  --es-border: #27272a;
  --es-input-bg: #18181b;
  --es-input-bg-focus: #1f1f23;
  --es-chip-bg: #27272a;
  --es-chip-fg: #f4f4f5;
  --es-card-bg: #111114;
  --es-shadow: 0 10px 40px -10px rgba(0,0,0,0.6), 0 2px 6px -2px rgba(0,0,0,0.3);
  --es-accent-soft: rgba(99,102,241,0.18);
}
.es-card {
  background: var(--es-card-bg);
  border: 1px solid var(--es-border);
  border-radius: var(--es-radius);
  box-shadow: var(--es-shadow);
  overflow: hidden;
}
.es-header {
  position: relative;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--es-accent) 0%, color-mix(in srgb, var(--es-accent) 60%, #ec4899) 100%);
  color: var(--es-accent-fg);
}
.es-header-row { display: flex; align-items: center; gap: 12px; }
.es-header-icon {
  width: 40px; height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}
.es-title { font-size: 18px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
.es-subtitle { font-size: 13px; margin: 2px 0 0; opacity: 0.9; }

.es-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }

.es-field { display: flex; flex-direction: column; gap: 6px; }
.es-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--es-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex; align-items: center; justify-content: space-between;
}
.es-label-hint { font-weight: 500; text-transform: none; letter-spacing: 0; opacity: 0.85; }

.es-input, .es-textarea, .es-select {
  width: 100%;
  padding: 10px 12px;
  background: var(--es-input-bg);
  color: var(--es-fg);
  border: 1px solid var(--es-border);
  border-radius: var(--es-radius-sm);
  font: inherit;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.es-input::placeholder, .es-textarea::placeholder { color: var(--es-muted); opacity: 0.7; }
.es-input:focus, .es-textarea:focus, .es-select:focus {
  border-color: var(--es-accent);
  background: var(--es-input-bg-focus);
  box-shadow: 0 0 0 3px var(--es-accent-soft);
}
.es-textarea { resize: vertical; min-height: 140px; font-family: inherit; }

.es-editor {
  border: 1px solid var(--es-border);
  border-radius: var(--es-radius-sm);
  background: var(--es-input-bg);
  overflow: hidden;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.es-editor.es-focus { border-color: var(--es-accent); box-shadow: 0 0 0 3px var(--es-accent-soft); }
.es-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
  padding: 6px;
  background: color-mix(in srgb, var(--es-chip-bg) 60%, var(--es-card-bg));
  border-bottom: 1px solid var(--es-border);
}
.es-tb-btn {
  border: 0; background: transparent; color: var(--es-fg);
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.es-tb-btn:hover { background: var(--es-chip-bg); }
.es-tb-btn:active { transform: translateY(1px); }
.es-tb-btn.es-on { background: var(--es-accent-soft); color: var(--es-accent); }
.es-tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.es-tb-sep { width: 1px; height: 18px; background: var(--es-border); margin: 0 4px; }
.es-content {
  min-height: 160px;
  max-height: 360px;
  overflow: auto;
  padding: 12px 14px;
  outline: none;
  font: inherit;
  color: var(--es-fg);
  line-height: 1.55;
}
.es-content:empty::before {
  content: attr(data-placeholder);
  color: var(--es-muted);
  opacity: 0.7;
  pointer-events: none;
}
.es-content p { margin: 0 0 8px; }
.es-content p:last-child { margin-bottom: 0; }
.es-content ul, .es-content ol { margin: 0 0 8px; padding-left: 22px; }
.es-content blockquote {
  margin: 0 0 8px;
  padding: 4px 12px;
  border-left: 3px solid var(--es-accent);
  background: var(--es-accent-soft);
  border-radius: 4px;
  color: var(--es-fg);
}
.es-content a { color: var(--es-accent); text-decoration: underline; }

.es-mode-toggle {
  display: inline-flex;
  background: var(--es-chip-bg);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.es-mode-btn {
  border: 0;
  background: transparent;
  color: var(--es-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  transition: background 120ms ease, color 120ms ease;
}
.es-mode-btn.es-active {
  background: var(--es-card-bg);
  color: var(--es-fg);
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}

.es-chips {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 8px;
  background: var(--es-input-bg);
  border: 1px solid var(--es-border);
  border-radius: var(--es-radius-sm);
  min-height: 44px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.es-chips.es-focus { border-color: var(--es-accent); box-shadow: 0 0 0 3px var(--es-accent-soft); }
.es-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 4px 4px 10px;
  background: var(--es-chip-bg);
  color: var(--es-chip-fg);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  max-width: 100%;
}
.es-chip.es-chip-invalid {
  background: color-mix(in srgb, var(--es-error) 15%, var(--es-chip-bg));
  color: var(--es-error);
}
.es-chip-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
.es-chip-remove {
  border: 0; background: transparent; color: inherit;
  width: 20px; height: 20px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: 0.7;
}
.es-chip-remove:hover { opacity: 1; background: rgba(0,0,0,0.06); }
.es-chip-input {
  border: 0; outline: none; background: transparent; color: var(--es-fg);
  font: inherit; flex: 1; min-width: 120px; padding: 4px 6px;
}

.es-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.es-checkbox { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--es-muted); user-select: none; }
.es-checkbox input { accent-color: var(--es-accent); }

.es-drop {
  border: 1.5px dashed var(--es-border);
  border-radius: var(--es-radius-sm);
  padding: 14px;
  text-align: center;
  color: var(--es-muted);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}
.es-drop:hover, .es-drop.es-drag {
  border-color: var(--es-accent);
  background: var(--es-accent-soft);
  color: var(--es-fg);
}
.es-drop-icon { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; }

.es-files { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.es-file {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  background: var(--es-input-bg);
  border: 1px solid var(--es-border);
  border-radius: var(--es-radius-sm);
  font-size: 13px;
}
.es-file-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.es-file-size { color: var(--es-muted); font-variant-numeric: tabular-nums; font-size: 12px; }
.es-icon-btn {
  border: 0; background: transparent; color: var(--es-muted);
  width: 28px; height: 28px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.es-icon-btn:hover { background: var(--es-chip-bg); color: var(--es-fg); }

.es-template-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: var(--es-accent-soft);
  border: 1px solid color-mix(in srgb, var(--es-accent) 25%, transparent);
  border-radius: var(--es-radius-sm);
}
.es-template-bar .es-select { background: var(--es-card-bg); }

.es-vars { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
.es-var-label { font-size: 11px; font-weight: 600; color: var(--es-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; display: block; }

.es-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 4px; }

.es-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 18px;
  background: var(--es-accent);
  color: var(--es-accent-fg);
  border: 0;
  border-radius: var(--es-radius-sm);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 80ms ease, filter 120ms ease, box-shadow 120ms ease;
  box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--es-accent) 60%, transparent);
}
.es-btn:hover:not(:disabled) { filter: brightness(1.05); }
.es-btn:active:not(:disabled) { transform: translateY(1px); }
.es-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

.es-status {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px;
  border-radius: var(--es-radius-sm);
  font-size: 13px;
  border: 1px solid var(--es-border);
}
.es-status.es-success { background: color-mix(in srgb, var(--es-success) 10%, transparent); border-color: color-mix(in srgb, var(--es-success) 35%, transparent); color: color-mix(in srgb, var(--es-success) 80%, var(--es-fg)); }
.es-status.es-error { background: color-mix(in srgb, var(--es-error) 10%, transparent); border-color: color-mix(in srgb, var(--es-error) 35%, transparent); color: color-mix(in srgb, var(--es-error) 80%, var(--es-fg)); }

.es-spin { animation: es-spin 800ms linear infinite; }
@keyframes es-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .es-spin { animation: none; }
  .es-btn, .es-input, .es-textarea, .es-select, .es-drop { transition: none; }
}
`;

function injectStylesOnce() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

// ---------- Rich text editor ----------

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabelledBy?: string;
}

/**
 * Self-contained contentEditable rich-text editor.
 * Uses document.execCommand for formatting â widely supported in all evergreen
 * browsers and zero external dependencies, keeping the module drop-in.
 */
function RichTextEditor({ value, onChange, placeholder, ariaLabelledBy }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focus, setFocus] = useState(false);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  // Keep the contentEditable's HTML in sync with `value` when it changes externally
  // (e.g. template applied). Avoid clobbering during user typing by comparing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    try {
      document.execCommand(command, false, arg);
    } catch {
      /* ignore */
    }
    if (ref.current) onChange(ref.current.innerHTML);
    rerender();
  };

  const isActive = (command: string): boolean => {
    if (typeof document === 'undefined') return false;
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const onInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Strip rich formatting on paste to avoid pulling in foreign styles.
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL', 'https://');
    if (!url) return;
    exec('createLink', url);
    // Make new links open in a new tab
    const el = ref.current;
    if (el) {
      el.querySelectorAll('a:not([data-es-linked])').forEach((a) => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('data-es-linked', '1');
      });
      onChange(el.innerHTML);
    }
  };

  type Btn =
    | { kind: 'cmd'; cmd: string; icon: React.ReactNode; label: string; arg?: string; toggle?: boolean }
    | { kind: 'sep' }
    | { kind: 'custom'; onClick: () => void; icon: React.ReactNode; label: string };

  const buttons: Btn[] = [
    { kind: 'cmd', cmd: 'bold', icon: <Bold size={15} />, label: 'Bold (Ctrl+B)', toggle: true },
    { kind: 'cmd', cmd: 'italic', icon: <Italic size={15} />, label: 'Italic (Ctrl+I)', toggle: true },
    { kind: 'cmd', cmd: 'underline', icon: <UnderlineIcon size={15} />, label: 'Underline (Ctrl+U)', toggle: true },
    { kind: 'cmd', cmd: 'strikeThrough', icon: <Strikethrough size={15} />, label: 'Strikethrough', toggle: true },
    { kind: 'sep' },
    { kind: 'cmd', cmd: 'insertUnorderedList', icon: <List size={15} />, label: 'Bulleted list', toggle: true },
    { kind: 'cmd', cmd: 'insertOrderedList', icon: <ListOrdered size={15} />, label: 'Numbered list', toggle: true },
    { kind: 'cmd', cmd: 'formatBlock', arg: 'blockquote', icon: <Quote size={15} />, label: 'Quote' },
    { kind: 'sep' },
    { kind: 'custom', onClick: insertLink, icon: <LinkIcon size={15} />, label: 'Insert link' },
    { kind: 'cmd', cmd: 'removeFormat', icon: <Eraser size={15} />, label: 'Clear formatting' },
    { kind: 'sep' },
    { kind: 'cmd', cmd: 'undo', icon: <Undo2 size={15} />, label: 'Undo' },
    { kind: 'cmd', cmd: 'redo', icon: <Redo2 size={15} />, label: 'Redo' },
  ];

  return (
    <div className={classes('es-editor', focus && 'es-focus')}>
      <div className="es-toolbar" role="toolbar" aria-label="Formatting">
        {buttons.map((b, i) => {
          if (b.kind === 'sep') return <span key={i} className="es-tb-sep" aria-hidden />;
          if (b.kind === 'custom') {
            return (
              <button
                key={i}
                type="button"
                className="es-tb-btn"
                title={b.label}
                aria-label={b.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={b.onClick}
              >
                {b.icon}
              </button>
            );
          }
          const active = !!b.toggle && isActive(b.cmd);
          return (
            <button
              key={i}
              type="button"
              className={classes('es-tb-btn', active && 'es-on')}
              title={b.label}
              aria-label={b.label}
              aria-pressed={b.toggle ? active : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(b.cmd, b.arg)}
            >
              {b.icon}
            </button>
          );
        })}
      </div>
      <div
        ref={ref}
        className="es-content"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby={ariaLabelledBy}
        data-placeholder={placeholder}
        onInput={onInput}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyUp={rerender}
        onMouseUp={rerender}
        onPaste={onPaste}
      />
    </div>
  );
}

// ---------- Component ----------

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function EmailSender(props: EmailSenderProps) {
  const {
    apiBaseUrl = DEFAULT_API_BASE,
    apiKey,
    defaultRecipients = [],
    defaultSubject = '',
    defaultBody = '',
    recipientMode: forcedMode,
    allowRecipientModeToggle = true,
    templates = [],
    allowAttachments = true,
    maxAttachmentBytes = DEFAULT_MAX_BYTES,
    title = 'Send Email',
    subtitle = 'Compose and deliver in seconds',
    accentColor,
    theme = 'light',
    resetOnSuccess = true,
    onSuccess,
    onError,
  } = props;

  useEffect(() => injectStylesOnce(), []);

  const [mode, setMode] = useState<'single' | 'multiple'>(
    forcedMode ?? (defaultRecipients.length > 1 ? 'multiple' : 'single'),
  );
  const [recipients, setRecipients] = useState<string[]>(defaultRecipients);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [chipsFocus, setChipsFocus] = useState(false);

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isHtml, setIsHtml] = useState(true);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [vars, setVars] = useState<Record<string, string>>({});

  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);

  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep mode in sync if the parent forces it
  useEffect(() => {
    if (forcedMode) setMode(forcedMode);
  }, [forcedMode]);

  // Apply selected template
  const applyTpl = useCallback(
    (tplId: string) => {
      setSelectedTemplateId(tplId);
      const tpl = templates.find((t) => t.id === tplId);
      if (!tpl) return;
      setSubject(tpl.subject);
      setBody(tpl.body);
      if (typeof tpl.isHtml === 'boolean') setIsHtml(tpl.isHtml);
      // Initialize variable map for this template's placeholders
      const placeholders = extractPlaceholders(tpl.subject, tpl.body);
      setVars((prev) => {
        const next: Record<string, string> = {};
        for (const k of placeholders) next[k] = prev[k] ?? '';
        return next;
      });
    },
    [templates],
  );

  const placeholders = useMemo(
    () => extractPlaceholders(subject, body),
    [subject, body],
  );

  const renderedSubject = useMemo(() => applyTemplate(subject, vars), [subject, vars]);
  const renderedBody = useMemo(() => applyTemplate(body, vars), [body, vars]);

  // ---------- Recipient chip helpers ----------
  const addRecipientFromDraft = useCallback(() => {
    const raw = recipientDraft.trim().replace(/[,;]+$/, '');
    if (!raw) return;
    setRecipients((prev) => (prev.includes(raw) ? prev : [...prev, raw]));
    setRecipientDraft('');
  }, [recipientDraft]);

  const onChipKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (recipientDraft.trim()) {
        e.preventDefault();
        addRecipientFromDraft();
      }
    } else if (e.key === 'Backspace' && !recipientDraft && recipients.length) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const onChipPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!/[,;\n\s]/.test(text)) return;
    e.preventDefault();
    const parts = text
      .split(/[,;\s\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    setRecipients((prev) => {
      const set = new Set(prev);
      for (const p of parts) set.add(p);
      return Array.from(set);
    });
  };

  // ---------- Attachments ----------
  const totalSize = useMemo(() => files.reduce((n, f) => n + f.size, 0), [files]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => `${f.name}:${f.size}`));
        const next = [...prev];
        for (const f of arr) {
          const key = `${f.name}:${f.size}`;
          if (!existing.has(key)) {
            next.push(f);
            existing.add(key);
          }
        }
        const sum = next.reduce((n, f) => n + f.size, 0);
        if (sum > maxAttachmentBytes) {
          setStatus({
            kind: 'error',
            message: `Attachments exceed the ${formatBytes(maxAttachmentBytes)} limit.`,
          });
          return prev;
        }
        return next;
      });
    },
    [maxAttachmentBytes],
  );

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    // allow re-selecting the same file
    e.target.value = '';
  };

  // ---------- Submit ----------
  const validate = (): string | null => {
    if (!subject.trim()) return 'Subject is required.';
    const plain = isHtml ? body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : body.trim();
    if (!plain) return 'Body is required.';
    const list = mode === 'single' ? recipients.slice(0, 1) : recipients;
    if (list.length === 0) {
      // Allowed: backend will fall back to configured ToEmail.
      return null;
    }
    const bad = list.find((r) => !EMAIL_RE.test(r));
    if (bad) return `"${bad}" is not a valid email address.`;
    return null;
  };

  const reset = () => {
    setRecipients(defaultRecipients);
    setRecipientDraft('');
    setSubject(defaultSubject);
    setBody(defaultBody);
    setFiles([]);
    setSelectedTemplateId('');
    setVars({});
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validate();
    if (err) {
      setStatus({ kind: 'error', message: err });
      return;
    }
    setStatus({ kind: 'sending' });

    const fd = new FormData();
    fd.append('Subject', renderedSubject);
    fd.append('Body', renderedBody);
    fd.append('IsHtml', String(isHtml));
    const list = mode === 'single' ? recipients.slice(0, 1) : recipients;
    if (list.length) fd.append('Recipients', list.join(','));
    for (const f of files) fd.append('Attachments', f, f.name);

    try {
      const url = `${apiBaseUrl.replace(/\/$/, '')}/api/email/send`;
      const headers: Record<string, string> = {};
      if (apiKey) headers['X-Api-Key'] = apiKey;
      const res = await fetch(url, { method: 'POST', body: fd, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || data?.message || `Request failed (${res.status})`;
        throw new Error(message);
      }
      const result: EmailSenderResult = {
        message: data.message ?? 'Email sent successfully',
        recipientCount: data.recipientCount ?? list.length,
        attachmentCount: data.attachmentCount ?? files.length,
      };
      setStatus({
        kind: 'success',
        message: `Sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'}${
          result.attachmentCount ? ` with ${result.attachmentCount} attachment${result.attachmentCount === 1 ? '' : 's'}` : ''
        }.`,
      });
      onSuccess?.(result);
      if (resetOnSuccess) reset();
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setStatus({ kind: 'error', message: error.message });
      onError?.(error);
    }
  };

  // ---------- Render ----------
  const sending = status.kind === 'sending';
  const accentStyle = accentColor ? ({ ['--es-accent' as never]: accentColor } as React.CSSProperties) : undefined;

  return (
    <div className={classes('es-root', theme === 'dark' && 'es-theme-dark')} style={accentStyle}>
      <form className="es-card" onSubmit={submit} noValidate>
        <div className="es-header">
          <div className="es-header-row">
            <span className="es-header-icon">
              <Mail size={20} aria-hidden />
            </span>
            <div>
              <h2 className="es-title">{title}</h2>
              {subtitle && <p className="es-subtitle">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="es-body">
          {/* Templates */}
          {templates.length > 0 && (
            <div className="es-template-bar">
              <Sparkles size={16} aria-hidden />
              <select
                className="es-select"
                value={selectedTemplateId}
                onChange={(e) => applyTpl(e.target.value)}
                aria-label="Email template"
                style={{ flex: 1 }}
              >
                <option value="">Choose a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.description ? ` — ${t.description}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Placeholder variables */}
          {placeholders.length > 0 && (
            <div className="es-field">
              <span className="es-label">
                Variables
                <span className="es-label-hint">Filled into {'{{placeholders}}'}</span>
              </span>
              <div className="es-vars">
                {placeholders.map((key) => (
                  <label key={key}>
                    <span className="es-var-label">{key}</span>
                    <input
                      className="es-input"
                      value={vars[key] ?? ''}
                      onChange={(e) => setVars((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={key}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Recipients */}
          <div className="es-field">
            <span className="es-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Users size={13} aria-hidden /> Recipients
              </span>
              {allowRecipientModeToggle && !forcedMode && (
                <span className="es-mode-toggle" role="tablist" aria-label="Recipient mode">
                  <button
                    type="button"
                    className={classes('es-mode-btn', mode === 'single' && 'es-active')}
                    onClick={() => setMode('single')}
                    role="tab"
                    aria-selected={mode === 'single'}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    className={classes('es-mode-btn', mode === 'multiple' && 'es-active')}
                    onClick={() => setMode('multiple')}
                    role="tab"
                    aria-selected={mode === 'multiple'}
                  >
                    Multiple
                  </button>
                </span>
              )}
            </span>

            {mode === 'single' ? (
              <input
                className="es-input"
                type="email"
                value={recipients[0] ?? ''}
                onChange={(e) => setRecipients(e.target.value ? [e.target.value] : [])}
                placeholder="recipient@example.com (leave empty to use default)"
                autoComplete="email"
              />
            ) : (
              <div
                className={classes('es-chips', chipsFocus && 'es-focus')}
                onClick={() => {
                  const el = document.activeElement as HTMLElement | null;
                  if (el?.tagName !== 'INPUT') {
                    (document.querySelector('.es-chip-input') as HTMLInputElement | null)?.focus();
                  }
                }}
              >
                {recipients.map((r, i) => {
                  const valid = EMAIL_RE.test(r);
                  return (
                    <span key={`${r}-${i}`} className={classes('es-chip', !valid && 'es-chip-invalid')}>
                      <span className="es-chip-text" title={r}>{r}</span>
                      <button
                        type="button"
                        className="es-chip-remove"
                        aria-label={`Remove ${r}`}
                        onClick={() => setRecipients((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
                <input
                  className="es-chip-input"
                  type="email"
                  value={recipientDraft}
                  onChange={(e) => setRecipientDraft(e.target.value)}
                  onKeyDown={onChipKeyDown}
                  onPaste={onChipPaste}
                  onBlur={() => {
                    setChipsFocus(false);
                    if (recipientDraft.trim()) addRecipientFromDraft();
                  }}
                  onFocus={() => setChipsFocus(true)}
                  placeholder={recipients.length ? 'Add another…' : 'Type email and press Enter'}
                  autoComplete="email"
                />
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="es-field">
            <label className="es-label" htmlFor="es-subject">
              Subject
            </label>
            <input
              id="es-subject"
              className="es-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          {/* Body */}
          <div className="es-field">
            <span className="es-label" id="es-body-label">
              <label htmlFor="es-body">Body</label>
              <label className="es-checkbox">
                <input
                  type="checkbox"
                  checked={isHtml}
                  onChange={(e) => setIsHtml(e.target.checked)}
                />
                Rich text (HTML)
              </label>
            </span>
            {isHtml ? (
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Write your message here. Use the toolbar to format."
                ariaLabelledBy="es-body-label"
              />
            ) : (
              <textarea
                id="es-body"
                className="es-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                required
              />
            )}
          </div>

          {/* Attachments */}
          {allowAttachments && (
            <div className="es-field">
              <span className="es-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Paperclip size={13} aria-hidden /> Attachments
                </span>
                <span className="es-label-hint">
                  {files.length
                    ? `${files.length} file${files.length === 1 ? '' : 's'} · ${formatBytes(totalSize)}`
                    : `Up to ${formatBytes(maxAttachmentBytes)}`}
                </span>
              </span>
              <div
                className={classes('es-drop', drag && 'es-drag')}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <span className="es-drop-icon">
                  <Plus size={16} /> Click or drop files to attach
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={onFileChange}
              />
              {files.length > 0 && (
                <div className="es-files">
                  {files.map((f, i) => (
                    <div className="es-file" key={`${f.name}-${i}`}>
                      <FileText size={16} aria-hidden />
                      <span className="es-file-name" title={f.name}>{f.name}</span>
                      <span className="es-file-size">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        className="es-icon-btn"
                        aria-label={`Remove ${f.name}`}
                        onClick={() => removeFile(i)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status */}
          {status.kind === 'success' && (
            <div className="es-status es-success" role="status">
              <CheckCircle2 size={16} aria-hidden />
              <span>{status.message}</span>
            </div>
          )}
          {status.kind === 'error' && (
            <div className="es-status es-error" role="alert">
              <AlertCircle size={16} aria-hidden />
              <span>{status.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="es-actions">
            <span style={{ color: 'var(--es-muted)', fontSize: 12 }}>
              {mode === 'multiple'
                ? `${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`
                : recipients[0]
                ? '1 recipient'
                : 'Default recipient'}
            </span>
            <button type="submit" className="es-btn" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 size={16} className="es-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send size={16} /> Send
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default EmailSender;
