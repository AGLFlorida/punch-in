import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'node:path';

import { ServiceManager } from './services/manager';
const services = ServiceManager.getInstance();

let tray: Tray | null = null;
let timer: NodeJS.Timeout | null = null;
let trayIcon: Electron.NativeImage | null = null;

// function format(ms: number) {
//   const s = Math.max(0, Math.floor(ms / 1000));
//   const h = String(Math.floor(s / 3600)).padStart(2, '0');
//   const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
//   const sec = String(s % 60).padStart(2, '0');
//   return `${h}:${m}:${sec}`;
// }

export function setupTray() {
  if (tray) return tray;

  // Resolve path to logo.png. In development the repo root contains img/logo.png.
  // In a packaged app, assets should be copied into resources (process.resourcesPath).
  const base = app.isPackaged ? process.resourcesPath : process.cwd();
  const iconPath = path.join(base, 'img', 'logo.png');

  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    // fallback to empty image so macOS shows only text
    icon = nativeImage.createEmpty();
  } else {
    // resize to a small tray-friendly size
    icon = icon.resize({ width: 16, height: 16 });
  }

  trayIcon = icon;
  tray = new Tray(trayIcon);
  // Ensure the tray image is set explicitly (some platforms may default to Electron icon)
  try { tray.setImage(trayIcon); } catch (e) { /* ignore if platform doesn't support setImage */ }

  tray.setToolTip('Time Punch');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: () => app.focus() },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' }
    ])
  );

  // tick every second
  if (timer) clearInterval(timer);
  timer = setInterval(updateTray, 1000);
  updateTray();
  return tray;
}

export function updateTray() {
  if (!tray) return;

  //const open = services.session()?.getOne(); TODO this runs constantly (on tick), need to fix that so we aren't slamming the DB
  const open = false;
  if (!open) {
    tray.setTitle('Idle');
    tray.setToolTip('Time Punch — Idle');
    // Always use the pre-resized tray icon so we don't accidentally set a large
    // image (for example a full-size PNG or .icns entry) that makes the menu
    // bar icon huge.
    if (trayIcon) {
      try { tray.setImage(trayIcon); } catch (e) { }
    }
    return;
  }
  //const elapsed = Date.now() //- open.start;
  const title = "foo" //`${format(elapsed)} — ${open.project}`;
  tray.setTitle(title);
  tray.setToolTip(`Time Punch — ${title}`);
}

export function cleanupTray() {
  if (timer) { clearInterval(timer); timer = null; }
  if (tray) { tray.destroy(); tray = null; }
}
