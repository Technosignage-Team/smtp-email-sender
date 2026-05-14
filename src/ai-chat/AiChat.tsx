import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Bot, CheckCircle2, Loader2, Mail, Send, User, XCircle } from 'lucide-react';

// ---------- CSS (scoped under .aic-root) ----------
const CSS = `
.aic-root *, .aic-root *::before, .aic-root *::after { box-sizing: border-box; }
.aic-root {
  display: flex; flex-direction: column;
  width: 100%; max-width: 720px;
  border-radius: 16px; overflow: hidden;
  border: 1px solid var(--aic-border);
  background: var(--aic-bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
}
/* messages */
.aic-messages {
  flex: 1; overflow-y: auto; padding: 20px 16px;
  display: flex; flex-direction: column; gap: 14px;
  min-height: 340px; max-height: 480px;
}
.aic-row { display: flex; gap: 8px; align-items: flex-start; }
.aic-row.user { flex-direction: row-reverse; }
.aic-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center; flex-shrink: 0;
  background: var(--aic-avatar-bg);
}
.aic-row.user .aic-avatar { background: #6366f1; }
.aic-row.system .aic-avatar { background: #059669; }
.aic-row.error .aic-avatar { background: #dc2626; }
.aic-bubble {
  max-width: 78%; padding: 10px 14px; border-radius: 14px;
  line-height: 1.6; white-space: pre-wrap; word-break: break-word;
  background: var(--aic-bubble-ai);
  color: var(--aic-text);
}
.aic-row.user .aic-bubble {
  background: #6366f1; color: #fff; border-bottom-right-radius: 4px;
}
.aic-row.system .aic-bubble {
  background: var(--aic-ok-bg); color: var(--aic-ok-text); border-bottom-left-radius: 4px;
}
.aic-row.error .aic-bubble {
  background: var(--aic-err-bg); color: var(--aic-err-text); border-bottom-left-radius: 4px;
}
.aic-row.ai .aic-bubble { border-bottom-left-radius: 4px; }
/* typing dots */
.aic-dots { display: flex; gap: 4px; padding: 2px 0; }
.aic-dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor; opacity: .5;
  animation: aic-bounce .8s infinite;
}
.aic-dots span:nth-child(2) { animation-delay: .15s; }
.aic-dots span:nth-child(3) { animation-delay: .3s; }
@keyframes aic-bounce {
  0%,80%,100% { transform: translateY(0) }
  40%          { transform: translateY(-5px) }
}
/* key banner */
.aic-key-banner {
  margin: 0 16px 0; padding: 10px 14px;
  border-radius: 10px; font-size: 12px; line-height: 1.5;
  background: var(--aic-banner-bg); color: var(--aic-banner-text);
  border: 1px solid var(--aic-border);
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
}
.aic-key-banner input {
  flex: 1; min-width: 200px; padding: 5px 9px; border-radius: 7px;
  border: 1px solid var(--aic-border);
  background: var(--aic-input-bg); color: var(--aic-text);
  font-size: 12px; outline: none; font-family: monospace;
}
.aic-key-banner input:focus { border-color: #6366f1; }
/* chips */
.aic-chips {
  padding: 0 16px 10px; display: flex; flex-wrap: wrap; gap: 6px;
}
.aic-chip {
  padding: 4px 11px; border-radius: 999px; font-size: 12px; cursor: pointer;
  border: 1px solid var(--aic-border); color: var(--aic-muted);
  background: transparent; transition: border-color .15s, color .15s;
  font-family: inherit;
}
.aic-chip:hover { border-color: #6366f1; color: #6366f1; }
/* input bar */
.aic-bar {
  border-top: 1px solid var(--aic-border);
  padding: 12px 14px; display: flex; gap: 8px; align-items: flex-end;
}
.aic-textarea {
  flex: 1; resize: none; border-radius: 10px; padding: 8px 12px;
  border: 1px solid var(--aic-border);
  background: var(--aic-input-bg); color: var(--aic-text);
  font-size: 13px; font-family: inherit; outline: none;
  min-height: 38px; max-height: 120px; overflow-y: auto; line-height: 1.5;
}
.aic-textarea:focus { border-color: #6366f1; }
.aic-send {
  background: #6366f1; color: #fff; border: none; border-radius: 10px;
  width: 38px; height: 38px; cursor: pointer; display: grid; place-items: center;
  flex-shrink: 0; transition: background .15s, transform .1s;
}
.aic-send:hover:not(:disabled) { background: #4f46e5; }
.aic-send:active:not(:disabled) { transform: scale(.95); }
.aic-send:disabled { background: var(--aic-border); cursor: not-allowed; }
`;

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

// ---------- Types ----------
interface Message {
  type: 'user' | 'ai' | 'system' | 'error';
  content: string;
}

export interface AiChatProps {
  /** Base URL of the EmailSenderApp .NET API (empty string in dev — Vite proxy handles it). */
  apiBaseUrl: string;
  /** Email API key (X-Api-Key). Can be empty; component shows a prompt if so. */
  apiKey: string;
  theme: 'light' | 'dark';
}

// ---------- Component ----------
export function AiChat({ apiBaseUrl, apiKey, theme }: AiChatProps) {
  injectCss();

  const isDark = theme === 'dark';

  const cssVars: React.CSSProperties = {
    '--aic-bg':          isDark ? '#18181b' : '#ffffff',
    '--aic-border':      isDark ? '#27272a' : '#e4e4e7',
    '--aic-text':        isDark ? '#fafafa' : '#18181b',
    '--aic-muted':       isDark ? '#71717a' : '#71717a',
    '--aic-bubble-ai':   isDark ? '#27272a' : '#f4f4f5',
    '--aic-avatar-bg':   isDark ? '#3f3f46' : '#e4e4e7',
    '--aic-input-bg':    isDark ? '#09090b' : '#fafafa',
    '--aic-banner-bg':   isDark ? '#1c1c1e' : '#fafafa',
    '--aic-banner-text': isDark ? '#a1a1aa' : '#52525b',
    '--aic-ok-bg':       isDark ? '#052e16' : '#f0fdf4',
    '--aic-ok-text':     isDark ? '#86efac' : '#166534',
    '--aic-err-bg':      isDark ? '#450a0a' : '#fef2f2',
    '--aic-err-text':    isDark ? '#fca5a5' : '#991b1b',
  } as React.CSSProperties;

  const [geminiKey, setGeminiKey] = useState<string>(
    () => localStorage.getItem('aic_gemini_key') ?? ''
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'ai',
      content:
        "Hi! I'm your AI email assistant.\n\nTell me what you'd like to send — for example:\n• \"Send a welcome email to john@example.com\"\n• \"Email alice@co.com with subject 'Meeting' and body 'See you at 3pm'\"\n• \"Send an HTML newsletter to team@example.com about our product launch\"\n\nI'll compose and send the email for you.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveGeminiKey = useCallback((val: string) => {
    setGeminiKey(val);
    localStorage.setItem('aic_gemini_key', val);
  }, []);

  const addMsg = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!apiKey) {
      addMsg({ type: 'error', content: 'Please enter your Email API key in the nav bar above.' });
      return;
    }

    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    addMsg({ type: 'user', content: text });
    setLoading(true);

    // Build history from current messages (exclude the initial greeting and system msgs)
    const history = messages
      .filter((m) => m.type === 'user' || m.type === 'ai')
      .map((m) => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      };
      if (geminiKey) headers['X-Gemini-Key'] = geminiKey;

      const res = await fetch(`${apiBaseUrl}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history }),
      });

      const data: { reply?: string; emailSent?: boolean; emailError?: string; error?: string } =
        await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

      if (!res.ok) {
        addMsg({ type: 'error', content: data.error ?? `Server error (${res.status})` });
        return;
      }

      if (data.emailSent) {
        addMsg({ type: 'system', content: '✅ Email sent successfully.' });
      }
      if (data.reply) {
        addMsg({ type: 'ai', content: data.reply });
      }
    } catch (err: unknown) {
      addMsg({
        type: 'error',
        content: err instanceof Error ? err.message : 'Network error. Is the server running?',
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, apiKey, geminiKey, apiBaseUrl, messages, addMsg]);

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
      // auto-grow
      setTimeout(() => {
        if (!taRef.current) return;
        taRef.current.style.height = 'auto';
        taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 120)}px`;
      }, 0);
    },
    [send]
  );

  const chips = [
    'Send a test email to me@example.com',
    "Email hello@example.com — subject: Hello, body: This is a test",
    'Send a professional welcome email to new@user.com',
  ];

  return (
    <div className="aic-root" style={cssVars}>
      {/* Gemini key banner (shown when key is missing) */}
      <div className="aic-key-banner" style={{ marginTop: 12 }}>
        <span>🔑 Gemini key</span>
        <input
          type="password"
          placeholder="AIza… (leave blank if server has it configured)"
          value={geminiKey}
          onChange={(e) => saveGeminiKey(e.target.value)}
          autoComplete="off"
        />
        <span style={{ fontSize: 11, opacity: 0.7 }}>
          Get one at{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#818cf8' }}
          >
            aistudio.google.com
          </a>
        </span>
      </div>

      {/* Messages */}
      <div className="aic-messages">
        {messages.map((m, i) => (
          <div key={i} className={`aic-row ${m.type}`}>
            <div className="aic-avatar">
              {m.type === 'user'   && <User   size={15} />}
              {m.type === 'ai'     && <Bot    size={15} />}
              {m.type === 'system' && <CheckCircle2 size={15} color="#fff" />}
              {m.type === 'error'  && <XCircle      size={15} color="#fff" />}
            </div>
            <div className="aic-bubble">{m.content}</div>
          </div>
        ))}

        {loading && (
          <div className="aic-row ai">
            <div className="aic-avatar">
              <Bot size={15} />
            </div>
            <div className="aic-bubble">
              <div className="aic-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Example chips */}
      <div className="aic-chips">
        {chips.map((c) => (
          <button key={c} className="aic-chip" onClick={() => setInput(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="aic-bar">
        <textarea
          ref={taRef}
          className="aic-textarea"
          rows={1}
          placeholder="Describe the email you want to send… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={loading}
        />
        <button className="aic-send" onClick={send} disabled={loading || !input.trim()}>
          {loading ? <Loader2 size={16} className="aic-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
