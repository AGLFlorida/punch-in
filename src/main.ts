import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { msToHMS } from './shared/time';

let win: BrowserWindow | null = null;
let tray: Tray | null = null;

type Session = { project: string; start: number; end: number };
type State = {
  running: boolean;
  currentProject: string;
  startTs: number | null;
  projects: string[];
};

const state: State = {
  running: false,
  currentProject: '',
  startTs: null,
  projects: ['Client A - Website', 'Client B - Mobile App', 'Internal - Admin', 'R&D']
};

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]', 'utf8');
}

function readSessions(): Session[] {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')) as Session[]; }
  catch { return []; }
}

function writeSessions(sessions: Session[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function elapsedNow(): number {
  return (state.running && state.startTs) ? (Date.now() - state.startTs) : 0;
}

function updateTray() {
  if (!tray) return;
  const labelTime = state.running ? msToHMS(elapsedNow()) : '00:00:00';
  const labelProj = state.currentProject || '—';
  tray.setTitle(`${labelTime} · ${labelProj}`);
  const menu = Menu.buildFromTemplate([
    { label: `${labelTime} — ${labelProj}`, enabled: false },
    { type: 'separator' },
    {
      label: state.running ? 'Stop' : 'Start',
      click: () => { state.running ? stopTimer() : startTimer(state.currentProject || state.projects[0]); }
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
  writeSessions(sessions);
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
      preload: path.join(process.cwd(), 'dist', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await win.loadFile(path.join('dist', 'renderer', 'index.html'));
  win.on('close', (e) => {
    e.preventDefault();
    win?.hide();
  });
}

app.whenReady().then(async () => {
  ensureDataDir();
  await createWindow();
  const tray = new Tray(nativeImage.createFromPath('assets/iconTemplate.png')); //@TODO provide an actual icon
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
  if (state.running) stopTimer();
});

// IPC
ipcMain.handle('state:get', () => ({ ...state }));
ipcMain.handle('timer:start', (_e, project: string) => { startTimer(project); return true; });
ipcMain.handle('timer:stop', () => { stopTimer(); return true; });
ipcMain.handle('projects:set', (_e, projects: string[]) => { state.projects = projects; updateTray(); return true; });
ipcMain.handle('sessions:list', () => readSessions());
