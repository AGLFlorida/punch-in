import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import path from 'node:path';

import { msToHMS, elapsedNow } from './shared/time';
import Database from 'better-sqlite3';
import { readSessions } from './shared/session';
import type { State, Session } from './types';


let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting: boolean = false;

const state: State = {
  running: false,
  currentProject: '',
  startTs: null,
  projects: ['Client A - Website', 'Client B - Mobile App', 'Internal - Admin', 'R&D']
};

function updateTray() {
  if (!tray) return;
  const labelTime = state.running ? msToHMS(elapsedNow(state)) : '00:00:00';
  const labelProj = state.currentProject || '—';
  tray.setTitle(`${labelTime} · ${labelProj}`);
  const menu = Menu.buildFromTemplate([
    { label: `${labelTime} — ${labelProj}`, enabled: false },
    { type: 'separator' },
    {
      label: state.running ? 'Stop' : 'Start',
      click: () => state.running ? stopTimer() : startTimer(state.currentProject || state.projects[0])
    },
    { type: 'separator' },
    { label: 'Show Window', click: () => win?.show() },
    { label: 'Quit', role: 'quit' }
  ]);
  tray.setContextMenu(menu);
}

function startTimer(project: string) {
  if (state.running) return;
  state.currentProject = project;
  state.startTs = Date.now();
  state.running = true;
  updateTray();
  win?.webContents.send('tick');
}

function stopTimer() {
  if (!state.running) return;
  const end = Date.now();
  const sessions = readSessions();
  sessions.push({ project: state.currentProject, start: state.startTs!, end });
  //writeSessions(sessions);
  saveSession({ project: state.currentProject, start: state.startTs!, end });
  state.running = false;
  state.startTs = null;
  updateTray();
  win?.webContents.send('sessions:updated');
}

async function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 420,
    show: false,
    title: 'Time Punch',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({ mode: 'detach', activate: true });
    win.webContents.on('console-message', (_e, level, message, line, source) => {
      console.log(`[renderer:${level}] ${message} (${source}:${line})`);
    });
  }

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win?.hide();
    }
  });
}

// SQLite setup (main process only)
const dbPath = path.join(app.getPath('userData'), 'punchin.sqlite');
let db: Database.Database;

function initDb() {
  db = new Database(dbPath);
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

function saveSession(row: { project: string; start: number; end: number }) {
  const stmt = db.prepare(
    'INSERT INTO sessions (project, start_ms, end_ms) VALUES (?, ?, ?)'
  );
  stmt.run(row.project, row.start, row.end);
}

function listSessions(): Array<Session> {
  const stmt = db.prepare(
    'SELECT project, start_ms AS start, end_ms AS end FROM sessions ORDER BY start_ms DESC LIMIT 2000'
  );
  
  return stmt.all() as Array<Session>;
}


app.whenReady().then(async () => {
  //ensureDataDir();
  initDb();
  await createWindow();

  tray = new Tray(nativeImage.createFromPath(
    path.join(__dirname, 'renderer', 'clock.svg')
  ));

  updateTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { createWindow(); }
    else { win?.show(); }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (state.running) stopTimer();
  try { db?.close(); } catch {}
});

// IPC
ipcMain.handle('state:get', () => ({ ...state }));
ipcMain.handle('timer:start', (_e, project: string) => { startTimer(project); return true; });
ipcMain.handle('timer:stop', () => { stopTimer(); return true; });
ipcMain.handle('projects:set', (_e, projects: string[]) => { state.projects = projects; updateTray(); return true; });
ipcMain.handle('sessions:list', () => listSessions());
ipcMain.handle('tick', () => console.log('tick')); 