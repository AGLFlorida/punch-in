import fs from 'node:fs'
import path from 'node:path'
import type { Session } from '../types';
import { DATA_DIR, ensureDataDir } from './data';

export const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

export function readSessions(): Session[] {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')) as Session[]; }
  catch { return []; }
}

export function writeSessions(sessions: Session[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}