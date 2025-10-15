import { Tray, Menu, nativeImage, app } from 'electron';
// import path from 'node:path';
//import { db } from './services/data';

import { ServiceManager } from './services/manager';
const services = ServiceManager.getInstance();

let tray: Tray | null = null;
let timer: NodeJS.Timeout | null = null;

// function format(ms: number) {
//   const s = Math.max(0, Math.floor(ms / 1000));
//   const h = String(Math.floor(s / 3600)).padStart(2, '0');
//   const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
//   const sec = String(s % 60).padStart(2, '0');
//   return `${h}:${m}:${sec}`;
// }

export function setupTray() {
  if (tray) return tray;

  // optional icon; empty image keeps just text in macOS menu bar
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

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
