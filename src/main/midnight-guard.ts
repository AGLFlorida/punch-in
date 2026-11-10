import { ServiceManager } from './services/manager';
import type { SessionService } from './services/session';
import type { PowerMonitor } from 'electron';

/**
 * Returns epoch ms for 23:59:59.999 of the given date in local time.
 */
export function getEndOfDay(date: Date): number {
  const eod = new Date(date);
  eod.setHours(23, 59, 59, 999);
  return eod.getTime();
}

/**
 * Returns milliseconds until the start of the next calendar day in local time.
 * Minimum of 1 ms to avoid a 0-delay loop.
 */
export function getMsUntilMidnight(now: Date = new Date()): number {
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.max(1, midnight.getTime() - now.getTime());
}

/**
 * Returns true if the given epoch ms timestamp falls on a different calendar
 * day than the reference date (local time).
 */
export function isCrossingMidnight(startTime: number, reference: Date = new Date()): boolean {
  const startDate = new Date(startTime);
  return startDate.toDateString() !== reference.toDateString();
}

// Injected by setupMidnightGuard; called whenever one or more sessions are auto-closed
let _onSessionClosed: (() => void) | undefined;

/**
 * Close every open session that started on a prior calendar day.
 *
 * Design note — per spec (issue #47): a session is stamped at 23:59:59.999
 * of the **day it started**, even if the system was asleep for multiple days.
 * Work on subsequent days is not attributed automatically; the user manually
 * starts each new day's session.  Sessions that began today are never closed
 * by this function.
 *
 * Accepts an optional SessionService so callers (and tests) can inject one;
 * falls back to the singleton. Passing `null` returns false immediately
 * (no service available); `undefined` triggers the singleton fallback.
 *
 * @returns true if at least one session was closed
 */
export function closeSessionsAcrossMidnight(session?: SessionService | null): boolean {
  // undefined → fall back to the singleton; null → no service, return early
  const svc = session === undefined ? ServiceManager.getInstance().session() : session;
  if (!svc) return false;

  // Start of today (00:00:00.000 local time) — anything before this crossed midnight
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff = startOfToday.getTime();

  const openRows = svc.getOpenRowsBeforeTime(cutoff);
  if (openRows.length === 0) return false;

  let anyClosed = false;
  for (const row of openRows) {
    // Stamp at 23:59:59.999 of the row's own start day (per spec)
    const eod = getEndOfDay(new Date(row.start_time));
    if (svc.stopSessionAt(row.id, eod)) {
      anyClosed = true;
    }
  }

  if (anyClosed) {
    _onSessionClosed?.();
  }

  return anyClosed;
}

let midnightTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Tracks whether the powerMonitor listener has been registered.
 * setupMidnightGuard is designed to be called once per app lifecycle;
 * this flag prevents duplicate listener registration if it is ever called
 * more than once (e.g. via hot-reload).  There is intentionally no reset
 * path — Electron restarts the entire process to reinitialise the app.
 */
let guardInitialized = false;

function scheduleMidnightClose(): void {
  if (midnightTimer) {
    clearTimeout(midnightTimer);
    midnightTimer = null;
  }

  const ms = getMsUntilMidnight();
  midnightTimer = setTimeout(() => {
    try {
      closeSessionsAcrossMidnight();
    } finally {
      scheduleMidnightClose(); // always reschedule, even if close throws
    }
  }, ms);

  // Allow Node/Electron to exit cleanly if the app quits while the timer is live
  midnightTimer.unref?.();
}

export interface MidnightGuardOptions {
  /**
   * Electron powerMonitor instance for system-sleep/resume detection.
   * When omitted the guard still runs via the midnight timer but cannot
   * react to wakeups.
   */
  powerMonitor?: PowerMonitor;
  /**
   * Callback invoked after one or more sessions are auto-closed at midnight.
   * Typically wired to `invalidateTrayCache` in the main process.
   */
  onSessionClosed?: () => void;
}

/**
 * Set up the midnight auto-stop guard.
 * Safe to call more than once — the powerMonitor listener is registered only once.
 *
 * - Closes any session that already crossed midnight (handles sleep / restart).
 * - Schedules a timer to auto-close at the next midnight.
 * - Re-arms after each midnight and after the system resumes from sleep.
 *
 * @param options - injectable Electron/tray dependencies (injected by main process)
 */
export function setupMidnightGuard(options: MidnightGuardOptions = {}): void {
  _onSessionClosed = options.onSessionClosed;

  // Handle any session that already spans midnight (startup or post-sleep)
  closeSessionsAcrossMidnight();

  // Arm the midnight timer
  scheduleMidnightClose();

  // Register the resume listener only once to avoid stacking
  if (guardInitialized) return;
  guardInitialized = true;

  // Re-arm after system wakes from sleep
  options.powerMonitor?.on('resume', () => {
    closeSessionsAcrossMidnight();
    scheduleMidnightClose();
  });
}
