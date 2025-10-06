import { app } from 'electron';
import { registerAppScheme, attachStaticHandler } from './protocol';
import { createMainWindow } from './windows';
import './ipc'; // registers ipcMain handlers (db, etc.)

registerAppScheme(); // before app ready

app.whenReady().then(async () => {
  await attachStaticHandler(); // map app://-/... -> dist/renderer/...
  await createMainWindow();    // create and load UI
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', async () => {
  if (await import('electron').then(m => m.BrowserWindow.getAllWindows()).then(w => w.length === 0)) {
    await createMainWindow();
  }
});
