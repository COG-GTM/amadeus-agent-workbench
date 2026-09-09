// Bottom drawer hosting the cryptic terminal. The full command UX (history,
// AN/SS/RT mirroring into the GUI) is implemented by the terminal feature work;
// this shell only wires the API call and renders output.
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Stable per-tab session id so the server can remember the last availability display. */
const SESSION_ID = (() => {
  const key = 'workbench.terminal.session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    sessionStorage.setItem(key, id);
  }
  return id;
})();

export function TerminalDrawer({ open, onClose }: Props) {
  const [lines, setLines] = useState<string[]>(['AMADEUS SELLING PLATFORM CONNECT — TYPE HE FOR HELP']);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  /** Sends the current input to the API and appends the response. */
  async function submit() {
    const command = input.trim();
    if (!command) return;
    setInput('');
    setLines((l) => [...l, `> ${command.toUpperCase()}`]);
    try {
      const res = await api.terminal({ command, sessionId: SESSION_ID });
      setLines((l) => [...l, ...res.lines, '']);
    } catch (e) {
      setLines((l) => [...l, `SYSTEM ERROR — ${(e as Error).message}`, '']);
    }
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 transition-transform duration-200',
        open ? 'translate-y-0' : 'translate-y-full',
      )}
      aria-hidden={!open}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-t-xl border border-b-0 border-emerald-900/60 bg-terminal-bg font-mono text-sm text-terminal-fg shadow-2xl">
          <div className="flex items-center justify-between border-b border-emerald-900/60 px-3 py-1.5 text-xs text-emerald-400/80">
            <span>CRYPTIC · SESSION {SESSION_ID.toUpperCase()}</span>
            <button onClick={onClose} className="rounded p-1 hover:bg-white/10" aria-label="Close terminal">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="scrollbar-thin h-56 overflow-y-auto whitespace-pre px-3 py-2 leading-5">
            {lines.map((line, i) => (
              <div key={i}>{line || '\u00a0'}</div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex items-center gap-2 border-t border-emerald-900/60 px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <span className="text-emerald-500">&gt;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent uppercase outline-none placeholder:text-emerald-800"
              placeholder="AN20SEPLHRJFK"
              spellCheck={false}
              autoComplete="off"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
