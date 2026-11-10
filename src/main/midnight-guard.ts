import { ServiceManager } from './services/manager';
import type { SessionService } from './services/session';

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

/**
 * Lazily require the tray module and invalidate its cache.
 * No-ops if the tray is unavailable (e.g. in test environment).
 */
function tryInvalidateTrayCache(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { invalidateTrayCache } = require('./tray');
    invalidateTrayCache();
  } catch {
    // Not available outside Electron (tests, etc.)
  }
}

/**
 * Close any open session that started before today.
 * The session is stamped with 23:59:59.999 of the day it started.
 *
 * Accepts an optional SessionService so callers (and tests) can inject one;
 * falls back to the singleton.
 *
 * @returns true if a session was closed
 */
export function closeSessionsAcrossMidnight(session?: SessionService | null): boolean {
  // undefined → fall back to the singleton; null → no service, return early
  const svc = session === undefined ? ServiceManager.getInstance().session() : session;
  if (!svc) return false;

  const openRow = svc.getOneRow();
  if (!openRow) return false;

  if (!isCrossingMidnight(openRow.start_time)) return false;

  const startDate = new Date(openRow.start_time);
  const eod = getEndOfDay(startDate);
  const closed = svc.stopAt(eod);

  if (closed) {
    tryInvalidateTrayCache();
  }

  return closed;
}

let midnightTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleMidnightClose(): void {
  if (midnightTimer) {
    clearTimeout(midnightTimer);
    midnightTimer = null;
  }

  const ms = getMsUntilMidnight();
  midnightTimer = setTimeout(() => {
    closeSessionsAcrossMidnight();
    scheduleMidnightClose(); // reschedule for the next midnight
  }, ms);
}

/**
 * Set up the midnight auto-stop guard.
 * Call this once after the app is ready.
 *
 * - Closes any session that already crossed midnight (handles sleep / restart).
 * - Schedules a timer to auto-close at the next midnight.
 * - Re-arms after each midnight and after the system resumes from sleep.
 */
export function setupMidnightGuard(): void {
  // Handle any session that already spans midnight (startup or post-sleep)
  closeSessionsAcrossMidnight();

  // Arm the midnight timer
  scheduleMidnightClose();

  // Re-arm after system wakes from sleep
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { powerMonitor } = require('electron');
    powerMonitor.on('resume', () => {
      closeSessionsAcrossMidnight();
      scheduleMidnightClose();
    });
  } catch {
    // Not available outside Electron (tests, etc.)
  }
}
