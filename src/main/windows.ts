import { BrowserWindow } from 'electron';
import path from 'node:path';

export async function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });  
  await win.loadURL('app://-/index.html'); // served by protocol.ts
  return win;
}
