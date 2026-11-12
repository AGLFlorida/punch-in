import { msToHMS, elapsedNow, fmtWallClock, roundToNearest15Min } from './time';
import type { PunchInState } from '../../main/handlers/types';
import type { TaskModel } from '../../main/services/task';

describe('msToHMS', () => {
  test('formats zero correctly', () => {
    expect(msToHMS(0)).toBe('00:00:00');
  });

  test('formats milliseconds less than one second', () => {
    expect(msToHMS(999)).toBe('00:00:00');
    expect(msToHMS(500)).toBe('00:00:00');
  });

  test('formats seconds correctly', () => {
    expect(msToHMS(1000)).toBe('00:00:01');
    expect(msToHMS(59_000)).toBe('00:00:59');
  });

  test('formats minutes correctly', () => {
    expect(msToHMS(60_000)).toBe('00:01:00');
    expect(msToHMS(61_000)).toBe('00:01:01');
    expect(msToHMS(3599_000)).toBe('00:59:59');
  });

  test('formats hours correctly', () => {
    expect(msToHMS(3_600_000)).toBe('01:00:00');
    expect(msToHMS(3661_000)).toBe('01:01:01');
    expect(msToHMS(7200_000)).toBe('02:00:00');
    expect(msToHMS(3661000)).toBe('01:01:01');
  });

  test('handles large values', () => {
    expect(msToHMS(86400_000)).toBe('24:00:00');
    expect(msToHMS(90000_000)).toBe('25:00:00');
  });

  test('handles negative values by clamping to zero', () => {
    expect(msToHMS(-1000)).toBe('00:00:00');
    expect(msToHMS(-100)).toBe('00:00:00');
  });
});

describe('elapsedNow', () => {
  test('returns 0 when not running', () => {
    const state: PunchInState = {
      running: false,
      currentTask: { name: 'test' } as TaskModel,
      startTs: Date.now() - 5000
    };
    expect(elapsedNow(state)).toBe(0);
  });

  test('returns 0 when startTs is null', () => {
    const state: PunchInState = {
      running: true,
      currentTask: { name: 'test' } as TaskModel,
      startTs: null
    };
    expect(elapsedNow(state)).toBe(0);
  });

  test('returns elapsed time when running with valid startTs', () => {
    const startTime = Date.now() - 5000;
    const state: PunchInState = {
      running: true,
      currentTask: { name: 'test' } as TaskModel,
      startTs: startTime
    };
    const elapsed = elapsedNow(state);
    expect(elapsed).toBeGreaterThan(0);
    expect(elapsed).toBeGreaterThanOrEqual(5000);
    expect(elapsed).toBeLessThan(6000); // Allow small margin for execution time
  });

  test('returns correct timing for past timestamp', () => {
    const pastTime = 1759422714624;
    const state: PunchInState = {
      running: true,
      currentTask: { name: 'underTest' } as TaskModel,
      startTs: pastTime
    };
    const elapsed = elapsedNow(state);
    expect(elapsed).toBeGreaterThan(0);
    // Use tolerance check to avoid timing issues between Date.now() calls
    // Allow up to 10ms difference to account for execution time
    const expected = Date.now() - pastTime;
    expect(elapsed).toBeGreaterThanOrEqual(expected - 10);
    expect(elapsed).toBeLessThanOrEqual(expected + 10);
  });
});

describe('fmtWallClock', () => {
  test('formats timestamp correctly', () => {
    const timestamp = new Date('2024-01-15T14:30:45').getTime();
    const formatted = fmtWallClock(timestamp);
    expect(formatted).toBe('2024-01-15 14:30:45');
  });

  test('formats date with single digit values correctly', () => {
    const timestamp = new Date('2024-01-05T09:05:03').getTime();
    const formatted = fmtWallClock(timestamp);
    expect(formatted).toBe('2024-01-05 09:05:03');
  });

  test('formats midnight correctly', () => {
    const timestamp = new Date('2024-01-15T00:00:00').getTime();
    const formatted = fmtWallClock(timestamp);
    expect(formatted).toBe('2024-01-15 00:00:00');
  });

  test('formats end of day correctly', () => {
    const timestamp = new Date('2024-01-15T23:59:59').getTime();
    const formatted = fmtWallClock(timestamp);
    expect(formatted).toBe('2024-01-15 23:59:59');
  });

  test('formats year boundary correctly', () => {
    const timestamp = new Date('2023-12-31T23:59:59').getTime();
    const formatted = fmtWallClock(timestamp);
    expect(formatted).toBe('2023-12-31 23:59:59');
  });
});

describe('roundToNearest15Min', () => {
  test('zero rounds to zero', () => {
    expect(roundToNearest15Min(0)).toBe(0);
  });

  test('exact 15-minute boundary is unchanged', () => {
    expect(roundToNearest15Min(900)).toBe(900);   // 15 min
    expect(roundToNearest15Min(1800)).toBe(1800); // 30 min
    expect(roundToNearest15Min(3600)).toBe(3600); // 60 min
  });

  test('rounds up to 45 min for 38-minute session (AC example)', () => {
    // 38 min = 2280 sec → nearest 15-min boundary is 2700 sec (45 min)
    expect(roundToNearest15Min(2280)).toBe(2700);
  });

  test('rounds down to 15 min for values closer to lower boundary', () => {
    // 17 min = 1020 sec → closer to 900 (15 min) than 1800 (30 min)
    expect(roundToNearest15Min(1020)).toBe(900);
  });

  test('rounds up to 30 min for values closer to upper boundary', () => {
    // 23 min = 1380 sec → closer to 1800 (30 min) than 900 (15 min)
    expect(roundToNearest15Min(1380)).toBe(1800);
  });

  test('rounds at exact midpoint (7.5 min past boundary) up', () => {
    // 22.5 min = 1350 sec → midpoint between 15 and 30, rounds to 30 (Math.round)
    expect(roundToNearest15Min(1350)).toBe(1800);
  });

  test('rounds down to 0 for value below first midpoint (7 min)', () => {
    // 7 min = 420 sec → closer to 0 than 900
    expect(roundToNearest15Min(420)).toBe(0);
  });

  test('rounds up at exact first midpoint (7.5 min)', () => {
    // 7.5 min = 450 sec → midpoint between 0 and 15 min, Math.round rounds half-up to 900
    expect(roundToNearest15Min(450)).toBe(900);
  });

  test('rounds down for large value closer to lower 15-min boundary', () => {
    // 2h 7min = 7620 sec: distance to 7200 (2h) = 420, distance to 8100 (2h15m) = 480
    expect(roundToNearest15Min(7620)).toBe(7200);
  });

  test('rounds up for large value closer to upper 15-min boundary', () => {
    // 2h 8min = 7680 sec: distance to 7200 (2h) = 480, distance to 8100 (2h15m) = 420
    expect(roundToNearest15Min(7680)).toBe(8100);
  });
});