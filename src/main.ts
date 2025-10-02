import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import type { Event, WebContentsConsoleMessageEventParams } from 'electron';
import path from 'node:path';

import { msToHMS, elapsedNow } from './shared/time.js';
import { readSessions } from './shared/session';
import type { State } from './types';

import { saveSession, initDb, closeDB, listSessions } from './shared/data.js';


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
    win.webContents.on('console-message', (e: Event<WebContentsConsoleMessageEventParams>) => {
      const { level, message, lineNumber, sourceId } = e;
      let log = console.log; // TODO abstract this logic into an actual logger.
      switch(level) {
        case 'debug':
          log = console.debug;
          break;
        case 'error':
          log = console.error;
          break;
        case 'info':
          log = console.info;
          break;
        case 'warning':
          log = console.warn;
          break;
      }
      log(`[${new Date(Date.now()).toISOString()}:RENDERER:${level.toLocaleUpperCase()}] ${message} (${sourceId}:${lineNumber})`);
    });
  }

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win?.hide();
    }
  });
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
  closeDB();
});

// IPC
ipcMain.handle('state:get', () => ({ ...state }));
ipcMain.handle('timer:start', (_e, project: string) => { startTimer(project); return true; });
ipcMain.handle('timer:stop', () => { stopTimer(); return true; });
ipcMain.handle('projects:set', (_e, projects: string[]) => { state.projects = projects; updateTray(); return true; });
ipcMain.handle('sessions:list', () => listSessions());
ipcMain.handle('tick', () => console.log('tick')); 