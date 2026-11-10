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
 *
 * Note: `require()` is used here rather than a top-level `import` because
 * this module is loaded in both the Electron main process and the Jest/Node
 * test environment.  Importing `./tray` at the module level would cause
 * Electron APIs (`Tray`, `nativeImage`) to be evaluated at load time, which
 * crashes in Node.  The same lazy-require pattern is used in
 * `src/main/handlers/session.ts` for the same reason.
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

  // getOpenRowsBeforeTime ensures start_time < cutoff; isCrossingMidnight is
  // applied here as an explicit guard so the midnight-crossing invariant is
  // visible at this layer and not solely delegated to the SQL query.
  const openRows = svc.getOpenRowsBeforeTime(cutoff)
    .filter(row => isCrossingMidnight(row.start_time));

  if (openRows.length === 0) return false;

  let anyClosed = false;
  for (const row of openRows) {
    // Stamp at 23:59:59.999 of the row's own start day
    const eod = getEndOfDay(new Date(row.start_time));
    if (svc.stopSessionAt(row.id, eod)) {
      anyClosed = true;
    }
  }

  if (anyClosed) {
    tryInvalidateTrayCache();
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
    closeSessionsAcrossMidnight();
    scheduleMidnightClose(); // reschedule for the next midnight
  }, ms);

  // Allow Node/Electron to exit cleanly if the app quits while the timer is live
  midnightTimer.unref?.();
}

/**
 * Set up the midnight auto-stop guard.
 * Safe to call more than once — the powerMonitor listener is registered only once.
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

  // Register the resume listener only once to avoid stacking
  if (guardInitialized) return;
  guardInitialized = true;

  // Re-arm after system wakes from sleep.
  // `powerMonitor` is loaded lazily (same rationale as tryInvalidateTrayCache)
  // so this module remains importable in the Node/Jest test environment.
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
