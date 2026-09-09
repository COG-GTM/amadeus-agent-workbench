// Bottom drawer hosting the cryptic terminal (green-on-black, Amadeus style).
//
// Features: command echo (`> AN20SEPLHRJFK`), ↑/↓ command history, Ctrl+L or
// `CLEAR` to wipe the screen, a blinking block cursor, resizable height (drag
// handle + two presets), a status bar (session / current PNR / READY|BUSY) and
// "Open in GUI →" links driven by the API's `effect` hints. Ctrl+` toggles the
// drawer from anywhere in the app.
//
// The drawer is fully self-contained: it only uses the `terminal-*` tokens and
// never changes the light theme of the surrounding pages.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { ChevronsDownUp, ChevronsUpDown, ExternalLink, X } from 'lucide-react';
import type { TerminalCommandResponse } from '@workbench/shared';
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

/** Persisted drawer height so the agent's preferred size survives reloads. */
const HEIGHT_KEY = 'workbench.terminal.height';
const HEIGHT_SMALL = 260;
const HEIGHT_LARGE = 520;
const HEIGHT_MIN = 160;

/** One echoed command together with the host's response. */
interface Exchange {
  id: number;
  command: string;
  lines: string[];
  ok: boolean;
  effect?: TerminalCommandResponse['effect'];
  pending?: boolean;
}

const BANNER: Exchange = {
  id: 0,
  command: '',
  lines: ['AMADEUS SELLING PLATFORM CONNECT — CRYPTIC MODE', 'TYPE HE FOR HELP · CTRL+L CLEARS · ↑/↓ HISTORY'],
  ok: true,
};

/** Reads the persisted height, clamped to something sensible for the current viewport. */
function initialHeight(): number {
  const stored = Number(localStorage.getItem(HEIGHT_KEY));
  return clampHeight(stored || HEIGHT_SMALL);
}

/** Keeps the drawer between HEIGHT_MIN and the viewport minus the app header. */
function clampHeight(h: number): number {
  const max = Math.max(HEIGHT_MIN, window.innerHeight - 120);
  return Math.min(max, Math.max(HEIGHT_MIN, Math.round(h)));
}

/** Builds the GUI link for an effect, or null when the effect has no GUI mirror. */
function effectLink(effect: Exchange['effect']): { href: string; label: string } | null {
  if (!effect) return null;
  if (effect.type === 'availability') {
    const q = effect.query;
    const sp = new URLSearchParams({
      origin: q.origin,
      destination: q.destination,
      date: q.date,
      passengers: String(q.passengers),
    });
    return { href: `/results?${sp}`, label: `OPEN IN GUI → ${q.origin}-${q.destination} ${q.date}` };
  }
  if (effect.type === 'retrieve') {
    return { href: `/bookings/${effect.pnr.locator}`, label: `OPEN IN GUI → PNR ${effect.pnr.locator}` };
  }
  return null;
}

export function TerminalDrawer({ open, onClose }: Props) {
  const navigate = useNavigate();

  // Ctrl+` can open the drawer without the parent knowing; the parent's `open`
  // prop always wins whenever it changes (e.g. the header "Cryptic" button).
  const [forcedOpen, setForcedOpen] = useState(false);
  useEffect(() => setForcedOpen(false), [open]);
  const visible = open || forcedOpen;

  const [exchanges, setExchanges] = useState<Exchange[]>([BANNER]);
  const [input, setInput] = useState('');
  const [caret, setCaret] = useState(0);
  const [busy, setBusy] = useState(false);
  const [currentPnr, setCurrentPnr] = useState<string | null>(null);
  const [workingPnr, setWorkingPnr] = useState(false);
  const [height, setHeight] = useState(initialHeight);

  const cmdHistory = useRef<string[]>([]);
  const histIdx = useRef<number>(-1);
  const draft = useRef('');
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setForcedOpen(false);
    onClose();
  }, [onClose]);

  // Global shortcut: Ctrl+` toggles the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        if (visible) close();
        else setForcedOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, close]);

  // Keep the prompt focused while the drawer is open, including after a response lands.
  useEffect(() => {
    if (visible && !busy) inputRef.current?.focus();
  }, [visible, busy]);

  // Keep the newest output in view without scrolling the page behind the drawer.
  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [exchanges, busy]);

  useEffect(() => {
    localStorage.setItem(HEIGHT_KEY, String(height));
  }, [height]);

  /** Tracks the caret so the block cursor is drawn at the right column. */
  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? input.length);

  /** Sends the current input to the API and appends the response. */
  async function submit() {
    const command = input.trim();
    if (!command || busy) return;
    setInput('');
    setCaret(0);
    histIdx.current = -1;
    draft.current = '';
    if (cmdHistory.current[0] !== command) cmdHistory.current.unshift(command);
    if (cmdHistory.current.length > 100) cmdHistory.current.pop();

    const upper = command.toUpperCase();
    if (upper === 'CLEAR' || upper === 'CLS') {
      setExchanges([]);
      return;
    }

    const id = nextId.current++;
    setExchanges((x) => [...x, { id, command: upper, lines: [], ok: true, pending: true }]);
    setBusy(true);
    try {
      const res = await api.terminal({ command, sessionId: SESSION_ID });
      setExchanges((x) => x.map((e) => (e.id === id ? { ...e, lines: res.lines, ok: res.ok, effect: res.effect, pending: false } : e)));
      if (res.effect?.type === 'retrieve') {
        setCurrentPnr(res.effect.pnr.locator);
        setWorkingPnr(false);
      } else if (res.effect?.type === 'sell') {
        setWorkingPnr(true);
      }
      if (res.ok && upper === 'IG') {
        setCurrentPnr(null);
        setWorkingPnr(false);
      }
    } catch (e) {
      setExchanges((x) =>
        x.map((ex) => (ex.id === id ? { ...ex, lines: [`SYSTEM ERROR — ${(e as Error).message.toUpperCase()}`], ok: false, pending: false } : ex)),
      );
    } finally {
      setBusy(false);
    }
  }

  /** Handles history navigation and clear shortcuts on the input. */
  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = cmdHistory.current;
      if (h.length === 0) return;
      if (histIdx.current === -1) draft.current = input;
      histIdx.current = Math.min(h.length - 1, histIdx.current + 1);
      const v = h[histIdx.current] ?? '';
      setInput(v);
      setCaret(v.length);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx.current === -1) return;
      histIdx.current -= 1;
      const v = histIdx.current === -1 ? draft.current : (cmdHistory.current[histIdx.current] ?? '');
      setInput(v);
      setCaret(v.length);
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setExchanges([]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  /** Drag handle: pointer-move resizes until pointer-up. */
  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const onMove = (ev: PointerEvent) => setHeight(clampHeight(startH + (startY - ev.clientY)));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const large = height >= (HEIGHT_SMALL + HEIGHT_LARGE) / 2;
  const before = input.slice(0, caret);
  const at = input.slice(caret, caret + 1);
  const after = input.slice(caret + 1);

  return (
    <div
      className={cn('fixed inset-x-0 bottom-0 z-40 transition-transform duration-200', visible ? 'translate-y-0' : 'translate-y-full')}
      aria-hidden={!visible}
    >
      {/* Block-cursor blink; scoped here so the rest of the app is untouched. */}
      <style>{`@keyframes tty-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }`}</style>
      <div className="mx-auto max-w-7xl px-4">
        <div
          className="flex flex-col rounded-t-xl border border-b-0 border-emerald-900/60 bg-terminal-bg font-mono text-[13px] text-terminal-fg shadow-2xl"
          style={{ height }}
        >
          {/* Drag handle */}
          <div
            onPointerDown={startResize}
            className="group flex h-2 shrink-0 cursor-row-resize items-center justify-center rounded-t-xl hover:bg-emerald-900/40"
            title="Drag to resize"
            role="separator"
            aria-orientation="horizontal"
          >
            <div className="h-0.5 w-12 rounded-full bg-emerald-800 group-hover:bg-emerald-500" />
          </div>

          {/* Title bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-emerald-900/60 px-3 py-1 text-xs text-emerald-400/80">
            <span className="tracking-wider">CRYPTIC · AMADEUS SELLING PLATFORM CONNECT</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHeight(clampHeight(large ? HEIGHT_SMALL : HEIGHT_LARGE))}
                className="rounded p-1 hover:bg-white/10"
                aria-label={large ? 'Shrink terminal' : 'Expand terminal'}
                title={large ? 'Shrink' : 'Expand'}
              >
                {large ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
              </button>
              <button onClick={close} className="rounded p-1 hover:bg-white/10" aria-label="Close terminal" title="Close (Esc)">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Screen */}
          <div
            ref={screenRef}
            onClick={() => inputRef.current?.focus()}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-2 leading-5"
          >
            {exchanges.map((ex) => {
              const link = effectLink(ex.effect);
              return (
                <div key={ex.id} className="mb-2 whitespace-pre">
                  {ex.command && <div className="text-emerald-200">&gt; {ex.command}</div>}
                  {ex.pending && <div className="text-emerald-600">...</div>}
                  {ex.lines.map((line, i) => (
                    <div key={i} className={cn(!ex.ok && 'text-amber-300')}>
                      {line || '\u00a0'}
                    </div>
                  ))}
                  {link && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(link.href);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-500/80 underline decoration-dotted underline-offset-2 hover:text-emerald-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prompt: the real <input> is transparent; the visible text + block cursor are drawn on top. */}
          <form
            className="relative flex shrink-0 items-center gap-2 border-t border-emerald-900/60 px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <span className="text-emerald-500">&gt;</span>
            <div className="relative flex-1 whitespace-pre leading-5">
              <div aria-hidden className="pointer-events-none uppercase">
                <span>{before}</span>
                <span
                  className="bg-terminal-fg text-terminal-bg"
                  style={{ animation: busy ? undefined : 'tty-blink 1.1s steps(1) infinite' }}
                >
                  {at || '\u00a0'}
                </span>
                <span>{after}</span>
                {!input && <span className="text-emerald-800">{'  AN20SEPLHRJFK'}</span>}
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setCaret(e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyDown={onKeyDown}
                onKeyUp={syncCaret}
                onClick={syncCaret}
                onSelect={syncCaret}
                readOnly={busy}
                className="absolute inset-0 w-full bg-transparent text-transparent caret-transparent uppercase outline-none selection:bg-emerald-700/60"
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="characters"
                aria-label="Cryptic command"
              />
            </div>
          </form>

          {/* Status bar */}
          <div className="flex shrink-0 items-center gap-4 border-t border-emerald-900/60 bg-black/30 px-3 py-1 text-[11px] tracking-wider text-emerald-500/80">
            <span>SESSION {SESSION_ID.toUpperCase()}</span>
            <span>LONBA0980 · AA/SU</span>
            <span className={cn(currentPnr && 'text-emerald-300')}>
              PNR {currentPnr ?? (workingPnr ? 'WORKING (DK)' : '------')}
            </span>
            <span className="ml-auto hidden sm:inline">↑↓ HISTORY · CTRL+L CLEAR · CTRL+` TOGGLE · ESC CLOSE</span>
            <span className={cn('font-semibold', busy ? 'text-amber-300' : 'text-emerald-300')}>{busy ? 'BUSY' : 'READY'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
