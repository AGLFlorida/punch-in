import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'node:path';
import { ServiceManager } from './services/manager';

const services = ServiceManager.getInstance();

let tray: Tray | null = null;
let timer: NodeJS.Timeout | null = null;
let trayIcon: Electron.NativeImage | null = null;

// Cache for session data to avoid constant DB queries
let cachedSession: { taskName: string; startTime: number } | null = null;
let cacheTimestamp: number = 0;
const TRAY_CACHE_TTL_MS = 5000; // Cache for 5 seconds

/**
 * Format milliseconds as HH:MM:SS
 */
function format(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

/**
 * Convert start_time to epoch milliseconds
 */
function getStartTimeAsMs(startTime: number | Date): number {
  return typeof startTime === 'number' ? startTime : new Date(startTime).getTime();
}

/**
 * Set tray to idle state
 */
function setTrayIdle(): void {
  if (!tray) return;
  tray.setTitle('Idle');
  tray.setToolTip('Punch In — Idle');
  // Always use the pre-resized tray icon so we don't accidentally set a large
  // image (for example a full-size PNG or .icns entry) that makes the menu
  // bar icon huge.
  if (trayIcon) {
    try { tray.setImage(trayIcon); } catch { /* IGNORE */ }
  }
}

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
  try { tray.setImage(trayIcon); } catch { /* ignore if platform doesn't support setImage */ }

  tray.setToolTip('Punch In');
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

  const sessionSvc = services.session();
  const taskSvc = services.task();
  
  if (!sessionSvc || !taskSvc) {
    setTrayIdle();
    return;
  }

  // Check cache first to avoid constant DB queries
  const now = Date.now();
  let sessionData = cachedSession;
  
  if (!sessionData || (now - cacheTimestamp) > TRAY_CACHE_TTL_MS) {
    // Refresh cache
    const sessionRow = sessionSvc.getOneRow();
    
    if (!sessionRow) {
      cachedSession = null;
      cacheTimestamp = now;
      setTrayIdle();
      return;
    }

    // Get the task details using optimized lookup
    const task = taskSvc.getOne(sessionRow.task_id);
    
    if (task && task.id) {
      const startTime = getStartTimeAsMs(sessionRow.start_time);
      
      cachedSession = {
        taskName: task.name,
        startTime: startTime
      };
      cacheTimestamp = now;
      sessionData = cachedSession;
    } else {
      cachedSession = null;
      cacheTimestamp = now;
      setTrayIdle();
      return;
    }
  }

  // Calculate elapsed time and format
  if (sessionData) {
    const elapsed = now - sessionData.startTime;
    const formattedTime = format(elapsed);
    const title = `${formattedTime} — ${sessionData.taskName}`;
    tray.setTitle(title);
    tray.setToolTip(`Punch In — ${title}`);
  } else {
    setTrayIdle();
  }
}

export function invalidateTrayCache() {
  cachedSession = null;
  cacheTimestamp = 0;
  // Immediately update the tray
  updateTray();
}

export function cleanupTray() {
  if (timer) { clearInterval(timer); timer = null; }
  if (tray) { tray.destroy(); tray = null; }
}
