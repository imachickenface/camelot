import { useState, useEffect, useRef, useCallback } from 'react';
import { useCamelot } from '../../state/CamelotContext';
import { PixelPanel, PixelButton, ArchHeader } from '../../components/ui';
import './hermes-chat.css';

const REASONING_LEVELS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
// Text-file cap for attachments — keeps a single attach from blowing up the prompt.
// Hermes has full local filesystem access on its own regardless; this is for
// pointing it at ONE specific file's contents as part of a message, not a bulk
// upload channel.
const MAX_ATTACH_BYTES = 200 * 1024;

/**
 * HERMES'S HALL — a standing, multi-turn conversation with local Hermes, distinct
 * from the Editor's one-shot "Give Hermes a Task" panel. Each message continues
 * the same Hermes Agent session server-side (`hermes -z --continue`, see
 * server/hermes.js's chatWithHermes) — real conversational memory, not history
 * replayed into the prompt. Transcript persists to src/data/hermeschat.json.
 *
 * Mounted via a custom tab's `contentRef: 'hermes-chat'` — see CustomTab.jsx's
 * registry and CamelotContext's addTab(name, contentRef).
 */
export default function HermesChat() {
  const { settings, updateSettings } = useCamelot();
  const reasoningEffort = REASONING_LEVELS.includes(settings.hermesReasoningEffort)
    ? settings.hermesReasoningEffort
    : 'low';
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null); // { name, content } | null
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/data/hermeschat')
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        if (alive) setMessages(Array.isArray(data.messages) ? data.messages : []);
      })
      .catch(() => {
        if (alive) setMessages([]);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && !attachedFile) || sending) return;
    // Fold the attached file's content into the actual message sent to Hermes —
    // shown to the user as a short "📎 filename" line, but Hermes gets the full text.
    const messageForHermes = attachedFile
      ? `Attached file: ${attachedFile.name}\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n${text}`
      : text;
    const displayText = attachedFile ? `📎 ${attachedFile.name}${text ? `\n${text}` : ''}` : text;
    setInput('');
    setAttachedFile(null);
    setSending(true);
    setError(null);
    // Optimistic: show the user's line immediately, Hermes's reply lands when it's ready.
    setMessages((prev) => [...prev, { role: 'user', text: displayText, at: new Date().toISOString() }]);
    try {
      const res = await fetch('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageForHermes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Hermes chat failed');
      setMessages((prev) => [...prev, { role: 'hermes', text: data.reply, at: new Date().toISOString() }]);
    } catch (err) {
      setError(err.message || 'Hermes chat failed');
    } finally {
      setSending(false);
    }
  }, [input, sending, attachedFile]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setError(null);
    if (file.size > MAX_ATTACH_BYTES) {
      setError(`"${file.name}" is too large to attach (${Math.round(file.size / 1024)}KB, ${Math.round(MAX_ATTACH_BYTES / 1024)}KB max) — tell Hermes its path instead, he can read it himself.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachedFile({ name: file.name, content: String(reader.result) });
    reader.onerror = () => setError(`Couldn't read "${file.name}" — is it a text file?`);
    reader.readAsText(file);
  }, []);

  // Local inference can take minutes — this lets you cut a reply short rather than
  // wait out the full 10-minute server-side timeout. Kills whatever's actually
  // running server-side (server/hermes.js's stopHermes()); handleSend's own catch
  // block picks up the resulting "Stopped" error and clears `sending`.
  const handleStop = useCallback(async () => {
    try {
      await fetch('/api/hermes/stop', { method: 'POST' });
    } catch {
      // best-effort — if this fails the call will still end on its own via timeout
    }
  }, []);

  return (
    <div className="page hermes-chat-page">
      <div className="hermes-chat-wrap">
        <PixelPanel className="hermes-chat">
          <ArchHeader className="hermes-chat__arch">
            <span className="font-title">Hermes&rsquo;s Hall</span>
          </ArchHeader>
          <p className="font-body t-ghost hermes-chat__hint">
            A standing conversation, not a one-off task — Hermes remembers everything said here
            across messages. Local, unrestricted, no approval prompts.
          </p>

          <div className="hermes-chat__settings">
            <label className="font-label t-gold hermes-chat__settings-label" htmlFor="hermes-reasoning">
              Reasoning
            </label>
            <select
              id="hermes-reasoning"
              className="hermes-chat__settings-select font-body"
              value={reasoningEffort}
              onChange={(e) => updateSettings({ hermesReasoningEffort: e.target.value })}
            >
              {REASONING_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <span className="font-body t-ghost hermes-chat__settings-hint">
              Lower = faster replies, less careful thinking. Higher = slower, more thorough.
            </span>
          </div>

          <div className="hermes-chat__log">
            {!loaded && <p className="font-body t-ghost">Loading…</p>}
            {loaded && messages.length === 0 && (
              <p className="font-body t-ghost hermes-chat__empty">Say something to Hermes.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`hermes-chat__msg hermes-chat__msg--${m.role}`}>
                <span className="font-label hermes-chat__who">{m.role === 'user' ? 'You' : 'Hermes'}</span>
                <p className="font-body hermes-chat__text">{m.text}</p>
              </div>
            ))}
            {sending && <p className="font-body t-ghost hermes-chat__thinking">Hermes is thinking…</p>}
            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="font-body hermes-chat__error" style={{ color: 'var(--crimson-bright)' }}>
              {error}
            </p>
          )}

          {attachedFile && (
            <div className="hermes-chat__attachment">
              <span className="font-body">📎 {attachedFile.name}</span>
              <button
                type="button"
                className="hermes-chat__attachment-remove"
                onClick={() => setAttachedFile(null)}
                aria-label={`Remove ${attachedFile.name}`}
              >
                ×
              </button>
            </div>
          )}

          <div className="hermes-chat__input-row">
            <input
              ref={fileInputRef}
              type="file"
              className="hermes-chat__file-input"
              onChange={handleFileChange}
              disabled={sending}
            />
            <PixelButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              title="Attach a text file to your next message"
            >
              📎
            </PixelButton>
            <textarea
              className="hermes-chat__input font-body"
              rows={2}
              placeholder="Say something to Hermes…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {sending ? (
              <PixelButton type="button" variant="crimson" onClick={handleStop}>
                Stop
              </PixelButton>
            ) : (
              <PixelButton type="button" onClick={handleSend} disabled={!input.trim() && !attachedFile}>
                Send
              </PixelButton>
            )}
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
