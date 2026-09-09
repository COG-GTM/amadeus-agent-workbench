// Parser/executor for cryptic terminal commands.
//
// Supported today: HE (help). AN / SS / RT are implemented by the terminal
// feature work — see docs/ARCHITECTURE.md for the intended command set.
import type { TerminalCommandResponse } from '@workbench/shared';

/** Per-session state so `SS` can refer to a line of the last `AN` response. */
export interface TerminalSession {
  lastAvailability: string[]; // flight ids in display order
  currentPnr: string | null;
}

const sessions = new Map<string, TerminalSession>();

/** Returns (creating if needed) the state for a client session. */
export function getSession(sessionId: string): TerminalSession {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { lastAvailability: [], currentPnr: null };
    sessions.set(sessionId, s);
  }
  return s;
}

const HELP = [
  'AMADEUS SELLING PLATFORM — COMMAND HELP',
  '',
  'AN20SEPLHRJFK        AVAILABILITY 20SEP LHR-JFK',
  'AN20SEPLHRJFK/AAF    ... AIR FRANCE ONLY',
  'SS1Y2                SELL 1 SEAT, CLASS Y, LINE 2',
  'RT                   RETRIEVE CURRENT PNR',
  'RTX7K2PQ             RETRIEVE PNR X7K2PQ',
  'HE                   THIS HELP',
];

/** Executes one command and returns preformatted output lines. */
export function runCommand(raw: string, sessionId: string): TerminalCommandResponse {
  getSession(sessionId);
  const cmd = raw.trim().toUpperCase();

  if (cmd === 'HE' || cmd.startsWith('HE ')) {
    return { ok: true, lines: HELP, effect: { type: 'none' } };
  }

  return { ok: false, lines: ['INVALID ENTRY — TYPE HE FOR HELP'], effect: { type: 'none' } };
}
