import { app } from 'electron';
import { registerAppScheme, attachStaticHandler } from './protocol';
import { createMainWindow } from './windows';
import { setupTray } from './tray';
// import { db } from './services/data';  
import { ServiceManager } from './services/manager';
import './handlers'; // registers ipcMain handlers (db, etc.)

//let isQuitting = false;
const services = ServiceManager.getInstance(); // TODO: better DI

registerAppScheme(); // before app ready

app.whenReady().then(async () => {
  await attachStaticHandler(); // map app://-/... -> dist/renderer/...
  await createMainWindow();    // create and load UI
  setupTray();
});

// Close the app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Maximize / minimize app.
app.on('activate', async () => {
  if (await import('electron').then(m => m.BrowserWindow.getAllWindows()).then(w => w.length === 0)) {
    await createMainWindow();
  }
});

// Shutdown routines
app.on('before-quit', () => {
  //isQuitting = true;
  //if (state.running) stopTimer();
  services.closeDB();
});