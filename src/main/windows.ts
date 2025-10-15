import { BrowserWindow, app, nativeImage } from 'electron';
import path from 'node:path';

function resolveAsset(...segments: string[]) {
  const base = app.isPackaged ? process.resourcesPath : process.cwd();
  return path.join(base, ...segments);
}

export async function createMainWindow() {
  const iconPath = resolveAsset('img', 'logo.png');
  const icon = nativeImage.createFromPath(iconPath);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: !icon.isEmpty() ? icon : undefined,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      sandbox: true
    }, 
  });
  await win.loadURL('app://-/index.html'); // served by protocol.ts
  
  // On macOS set Dock icon explicitly (works when packaged)
  if (process.platform === 'darwin' && !icon.isEmpty() && app.dock) {
    try { app.dock.setIcon(icon); } catch (e) { /* ignore in unsupported runtimes */ }
  }

  if (process.env.ENABLE_CONSOLE === "1") {
    console.info(`ENABLE_CONSOLE: ${process.env.ENABLE_CONSOLE}, Opening Dev tools`)
    win.webContents.openDevTools();
  }
  
  return win;
}
