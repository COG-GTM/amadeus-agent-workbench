// Cryptic terminal endpoint (Amadeus Selling Platform style commands).
// The command parser lives in services/terminal.service.ts.
import { Router } from 'express';
import { z } from 'zod';
import type { TerminalCommandResponse } from '@workbench/shared';
import { runCommand } from '../services/terminal.service.ts';

export const terminalRouter = Router();

const schema = z.object({
  command: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(64),
});

terminalRouter.post('/terminal', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid terminal request', details: parsed.error.flatten() });
    return;
  }
  const out: TerminalCommandResponse = runCommand(parsed.data.command, parsed.data.sessionId);
  res.json(out);
});
