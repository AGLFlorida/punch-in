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
/** Stored so teardownMidnightGuard can remove it via powerMonitor.off. */
let _powerMonitor: PowerMonitor | undefined;
let _resumeListener: (() => void) | undefined;
/** True after teardownMidnightGuard has been called; prevents stale timer/resume callbacks. */
let _tornDown = false;

function scheduleMidnightClose(): void {
  if (midnightTimer) {
    clearTimeout(midnightTimer);
    midnightTimer = null;
  }

  const ms = getMsUntilMidnight();
  midnightTimer = setTimeout(() => {
    try {
      closeSessionsAcrossMidnight();
    } catch (err) {
      console.error('[midnight-guard] failed to auto-close sessions at midnight:', err);
    } finally {
      // Always reschedule for the NEXT midnight (~24 h away), even on error.
      // getMsUntilMidnight() computes tomorrow's 00:00:00 relative to the
      // current clock, so a DB error at midnight does not produce a tight loop —
      // the next attempt is ~24 h later, not 1 ms.
      if (!_tornDown) scheduleMidnightClose();
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
 *
 * - Updates the `onSessionClosed` callback and re-arms the midnight timer on
 *   every call (safe to call more than once).
 * - Registers the `powerMonitor` resume listener at most once per lifecycle.
 *   teardownMidnightGuard removes the listener so a fresh setup can re-register.
 *
 * @param options - injectable Electron/tray dependencies (provided by main process)
 */
export function setupMidnightGuard(options: MidnightGuardOptions = {}): void {
  _tornDown = false;

  // Only overwrite the callback when explicitly provided; omitting it on a
  // subsequent call preserves the previously registered callback.
  if (options.onSessionClosed !== undefined) {
    _onSessionClosed = options.onSessionClosed;
  }

  // Handle any session that already spans midnight (startup or post-sleep)
  try {
    closeSessionsAcrossMidnight();
  } catch (err) {
    console.error('[midnight-guard] failed to auto-close sessions at startup:', err);
  }

  // Arm the midnight timer (clears any previous timer first)
  scheduleMidnightClose();

  // Register the resume listener only when a powerMonitor is supplied and no
  // listener is already active. teardownMidnightGuard removes the previous
  // listener via powerMonitor.off, so this is safe to call after a teardown.
  if (!_resumeListener && options.powerMonitor) {
    _powerMonitor = options.powerMonitor;
    _resumeListener = () => {
      if (_tornDown) return; // guard was shut down; ignore stale events
      try {
        closeSessionsAcrossMidnight();
      } catch (err) {
        console.error('[midnight-guard] failed to auto-close sessions on resume:', err);
      } finally {
        if (!_tornDown) scheduleMidnightClose(); // reschedule only if still active
      }
    };
    _powerMonitor.on('resume', _resumeListener);
  }
}

/**
 * Stop the midnight timer and remove the powerMonitor listener.
 * Call this during app shutdown (e.g. from the `before-quit` handler) to
 * prevent the timer or resume handler from firing after the DB has been closed.
 * After teardown, setupMidnightGuard can be called again to re-arm the guard.
 */
export function teardownMidnightGuard(): void {
  _tornDown = true;
  if (midnightTimer) {
    clearTimeout(midnightTimer);
    midnightTimer = null;
  }
  // Remove the stored listener so we don't leak it and so a subsequent
  // setupMidnightGuard call can register a new one cleanly.
  if (_powerMonitor && _resumeListener) {
    _powerMonitor.off('resume', _resumeListener);
  }
  _powerMonitor = undefined;
  _resumeListener = undefined;
}
