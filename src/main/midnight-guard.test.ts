import {
  getEndOfDay,
  getMsUntilMidnight,
  isCrossingMidnight,
  closeSessionsAcrossMidnight,
} from './midnight-guard';
import { SessionService } from './services/session';
import { CompanyService } from './services/company';
import { ProjectService } from './services/project';
import { TaskService } from './services/task';
import { createMockDatabase } from '../__tests__/helpers/mock-db';

// ─── Pure utility functions ───────────────────────────────────────────────────

describe('getEndOfDay', () => {
  test('returns 23:59:59.999 of the given date in local time', () => {
    const date = new Date(2024, 0, 15, 10, 30, 0, 0); // Jan 15 2024 10:30
    const eod = new Date(getEndOfDay(date));
    expect(eod.getHours()).toBe(23);
    expect(eod.getMinutes()).toBe(59);
    expect(eod.getSeconds()).toBe(59);
    expect(eod.getMilliseconds()).toBe(999);
  });

  test('falls on the same calendar day as the input', () => {
    const date = new Date(2024, 5, 20, 8, 0, 0); // Jun 20
    const eod = new Date(getEndOfDay(date));
    expect(eod.getFullYear()).toBe(date.getFullYear());
    expect(eod.getMonth()).toBe(date.getMonth());
    expect(eod.getDate()).toBe(date.getDate());
  });

  test('does not mutate the input date', () => {
    const date = new Date(2024, 0, 15, 10, 0, 0);
    const originalTime = date.getTime();
    getEndOfDay(date);
    expect(date.getTime()).toBe(originalTime);
  });
});

describe('getMsUntilMidnight', () => {
  test('returns a positive number less than 24 hours', () => {
    const ms = getMsUntilMidnight();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  test('returns exactly 24 hours for a date at midnight (00:00:00.000)', () => {
    // next midnight is exactly 24 h away from 00:00:00.000 of the same day
    const atMidnight = new Date(2024, 0, 15, 0, 0, 0, 0);
    const ms = getMsUntilMidnight(atMidnight);
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  test('returns exactly 1 ms for a date at 23:59:59.999', () => {
    // pure function with fixed input: next midnight is exactly 1 ms away
    const almostMidnight = new Date(2024, 0, 15, 23, 59, 59, 999);
    const ms = getMsUntilMidnight(almostMidnight);
    expect(ms).toBe(1);
  });
});

describe('isCrossingMidnight', () => {
  test('returns false when start_time is on the same day as reference', () => {
    const reference = new Date(2024, 0, 15, 15, 0, 0);
    const startTime = new Date(2024, 0, 15, 10, 0, 0).getTime();
    expect(isCrossingMidnight(startTime, reference)).toBe(false);
  });

  test('returns true when start_time is on a previous day', () => {
    const reference = new Date(2024, 0, 16, 1, 0, 0); // Jan 16 01:00
    const startTime = new Date(2024, 0, 15, 23, 0, 0).getTime(); // Jan 15 23:00
    expect(isCrossingMidnight(startTime, reference)).toBe(true);
  });

  test('returns true when multiple days have passed', () => {
    const reference = new Date(2024, 0, 20, 10, 0, 0);
    const startTime = new Date(2024, 0, 17, 22, 0, 0).getTime();
    expect(isCrossingMidnight(startTime, reference)).toBe(true);
  });

  test('uses current date when reference is omitted', () => {
    // A start_time far in the past must cross midnight relative to now
    const oldStart = new Date(2000, 0, 1, 10, 0, 0).getTime();
    expect(isCrossingMidnight(oldStart)).toBe(true);
  });
});

// ─── closeSessionsAcrossMidnight ─────────────────────────────────────────────

describe('closeSessionsAcrossMidnight', () => {
  let db: ReturnType<typeof createMockDatabase>;
  let sessionSvc: SessionService;
  let testTaskId: number;

  beforeEach(() => {
    db = createMockDatabase();
    void new CompanyService(db);
    void new ProjectService(db);
    void new TaskService(db);
    sessionSvc = new SessionService(db);

    const companyId = db.prepare('INSERT INTO company (name) VALUES (?)').run('Co').lastInsertRowid as number;
    const projectId = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Proj', companyId).lastInsertRowid as number;
    testTaskId = db.prepare('INSERT INTO task (name, project_id) VALUES (?, ?)').run('Task', projectId).lastInsertRowid as number;
  });

  afterEach(() => {
    db.close();
  });

  test('returns false when no open session exists', () => {
    expect(closeSessionsAcrossMidnight(sessionSvc)).toBe(false);
  });

  test('returns false when open session started today', () => {
    const startTime = Date.now() - 1000; // 1 second ago — same day
    db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, startTime);
    expect(closeSessionsAcrossMidnight(sessionSvc)).toBe(false);
  });

  test('closes a session that started yesterday and stamps it at 23:59:59.999 of that day', () => {
    // Build a start_time that is definitely "yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(22, 0, 0, 0); // 22:00 yesterday
    const startTime = yesterday.getTime();

    const sessionId = db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, startTime).lastInsertRowid as number;

    const result = closeSessionsAcrossMidnight(sessionSvc);
    expect(result).toBe(true);

    // Session must be closed now
    expect(sessionSvc.getOneRow()).toBeNull();

    // end_time must equal 23:59:59.999 of yesterday
    const expectedEod = getEndOfDay(yesterday);
    const row = db.prepare('SELECT end_time FROM session WHERE id = ?').get(sessionId) as { end_time: number } | undefined;
    expect(row?.end_time).toBe(expectedEod);
  });

  test('closes a session that crossed multiple days (long sleep)', () => {
    // Session started 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(21, 0, 0, 0);
    const startTime = threeDaysAgo.getTime();

    db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, startTime);

    const result = closeSessionsAcrossMidnight(sessionSvc);
    expect(result).toBe(true);

    const expectedEod = getEndOfDay(threeDaysAgo);
    const row = db.prepare('SELECT end_time FROM session WHERE task_id = ?').get(testTaskId) as { end_time: number } | undefined;
    expect(row?.end_time).toBe(expectedEod);
  });

  test('returns false when session service is null', () => {
    expect(closeSessionsAcrossMidnight(null)).toBe(false);
  });
});
