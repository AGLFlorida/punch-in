import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export const DATA_DIR = path.join(app.getPath('userData'), 'data');

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  //if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]', 'utf8');
}