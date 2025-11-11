import { msToHMS, elapsedNow, fmtWallClock } from './time';
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