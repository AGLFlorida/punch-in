import fs from 'node:fs';
import path from 'node:path';
import { app, Data } from 'electron';
import Database from 'better-sqlite3';

import type { Session } from '../types';

export const DATA_DIR = path.join(app.getPath('userData'), 'data');

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// SQLite setup (main process only)
const dbPath = path.join(app.getPath('userData'), 'punchin.sqlite');
let db: Database.Database;

export function initDb() {
  if (process.env.NODE_ENV == 'development') {
    console.log('[DB path]', DATA_DIR); 
  }
  db = new Database(DATA_DIR);
  
  // Faster, safe journaling
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      project  TEXT NOT NULL,
      start_ms INTEGER NOT NULL,
      end_ms   INTEGER NOT NULL
    );
  `);
}

export function saveSession(row: { project: string; start: number; end: number }) {
  const stmt = db.prepare(
    'INSERT INTO sessions (project, start_ms, end_ms) VALUES (?, ?, ?)'
  );
  stmt.run(row.project, row.start, row.end);
}

export function listSessions(): Array<Session> {
  const stmt = db.prepare(
    'SELECT project, start_ms AS start, end_ms AS end FROM sessions ORDER BY start_ms DESC LIMIT 2000'
  );
  
  return stmt.all() as Array<Session>;
}

export function closeDB(): Boolean{
   try { 
    db.close(); 
    return true;
  } catch (err) {
    console.error(`[${new Date(Date.now()).toISOString()}:ERROR:DATABASE:CLOSE]`, err)
    return false;
  }
}