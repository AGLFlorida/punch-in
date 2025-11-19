import { BrowserWindow, app, nativeImage, shell } from 'electron';
import path from 'node:path';

function resolveAsset(...segments: string[]) {
  // Use correct asset root for packaged vs dev
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

  // Open external URLs in the system browser instead of Electron windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' }; // Prevent opening in Electron window
    }
    return { action: 'allow' }; // Allow app:// URLs to open normally
  });

  // Also handle navigation to external URLs
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // On macOS set Dock icon explicitly (works when packaged)
  if (process.platform === 'darwin' && !icon.isEmpty() && app.dock) {
    try { app.dock.setIcon(icon); } catch { /* ignore in unsupported runtimes */ }
  }

  if (process.env.ENABLE_CONSOLE === "1") {
    console.info(`ENABLE_CONSOLE: ${process.env.ENABLE_CONSOLE}, Opening Dev tools`)
    win.webContents.openDevTools();
  }

  return win;
}
