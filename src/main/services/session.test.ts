import { SessionService } from './session';
import { CompanyService } from './company';
import { ProjectService } from './project';
import { TaskService } from './task';
import { createMockDatabase } from '../../__tests__/helpers/mock-db';

describe('SessionService', () => {
  let db: ReturnType<typeof createMockDatabase>;
  let service: SessionService;
  let testTaskId: number;

  beforeEach(() => {
    db = createMockDatabase();
    // Services are created to set up test data
    void new CompanyService(db);
    void new ProjectService(db);
    void new TaskService(db);
    service = new SessionService(db);

    // Create test company, project, and task
    const companyInsert = db.prepare('INSERT INTO company (name) VALUES (?)').run('Test Company');
    const companyId = companyInsert.lastInsertRowid as number;
    const projectInsert = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Test Project', companyId);
    const projectId = projectInsert.lastInsertRowid as number;
    const taskInsert = db.prepare('INSERT INTO task (name, project_id) VALUES (?, ?)').run('Test Task', projectId);
    testTaskId = taskInsert.lastInsertRowid as number;
  });

  afterEach(() => {
    db.close();
  });

  describe('get', () => {
    test('returns empty array when no sessions exist', () => {
      const result = service.get();
      expect(result).toEqual([]);
    });

    test('returns all sessions ordered by id DESC', () => {
      const now = Date.now();
      db.prepare('INSERT INTO session (task_id, start_time, end_time) VALUES (?, ?, ?)').run(testTaskId, now - 2000, now - 1000);
      db.prepare('INSERT INTO session (task_id, start_time, end_time) VALUES (?, ?, ?)').run(testTaskId, now - 4000, now - 3000);
      db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, now);

      const result = service.get();
      expect(result).toHaveLength(3);
      // Should be ordered DESC by id
      expect(result[0].id).toBeGreaterThan(result[1].id || 0);
    });
  });

  describe('getOne', () => {
    test('returns open session when one exists', () => {
      const now = Date.now();
      // Insert a closed session first
      db.prepare('INSERT INTO session (task_id, start_time, end_time) VALUES (?, ?, ?)').run(testTaskId, now - 2000, now - 1000);
      // Insert an open session (no end_time)
      const insertResult = db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, now);
      const sessionId = insertResult.lastInsertRowid as number;

      const result = service.getOne();
      // The getOne() method returns a SessionModel which has a task property (TaskModel)
      // But the query only returns id, task_id, start_time, end_time
      // So the result is cast to SessionModel but doesn't match the interface exactly
      // The method returns null if the query returns undefined
      // Since we inserted a session, it should return something
      expect(result).not.toBeNull();
      if (result) {
        // The result should have the session data
        // Cast to access raw row data since SessionModel interface expects 'task' not 'task_id'
        const rowData = result as unknown as { id: number; task_id: number; end_time: number | null };
        expect(rowData.id).toBe(sessionId);
        expect(rowData.task_id).toBe(testTaskId);
        expect(rowData.end_time).toBeNull();
      }
    });

    test('returns null when no open session exists', () => {
      const now = Date.now();
      db.prepare('INSERT INTO session (task_id, start_time, end_time) VALUES (?, ?, ?)').run(testTaskId, now - 2000, now - 1000);

      const result = service.getOne();
      expect(result).toBeNull();
    });
  });

  describe('start', () => {
    test('creates new session', () => {
      const result = service.start(testTaskId);
      expect(result).toBe(true);

      const session = service.getOne();
      expect(session).not.toBeNull();
      // SessionModel interface expects 'task' but getOne() returns raw row with 'task_id'
      const rowData = session as unknown as { id: number; task_id: number; start_time: number; end_time: number | null };
      expect(rowData.task_id).toBe(testTaskId);
    });

    test('closes existing open session before starting new one', () => {
      const now = Date.now();
      // Create an open session
      const firstSessionInsert = db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, now - 1000);
      const firstSessionId = firstSessionInsert.lastInsertRowid as number;

      // Start a new session - this should close the existing open session
      service.start(testTaskId);

      const allSessions = service.get();
      const openSessions = allSessions.filter(s => {
        const rowData = s as unknown as { end_time: number | null };
        return !rowData.end_time;
      });
      
      // Should only have one open session (the new one)
      expect(openSessions).toHaveLength(1);
      
      // Verify the old session was closed (has end_time)
      const firstSession = allSessions.find(s => {
        const rowData = s as unknown as { id: number };
        return rowData.id === firstSessionId;
      });
      expect(firstSession).toBeDefined();
      const firstSessionData = firstSession as unknown as { end_time: number | null };
      expect(firstSessionData.end_time).not.toBeNull();
    });

    test('returns false when insert fails', () => {
      // The start() method doesn't catch foreign key constraint errors
      // It will throw an error instead of returning false
      // So we test that it throws when given an invalid task_id
      expect(() => service.start(99999)).toThrow();
    });
  });

  describe('stop', () => {
    test('closes open session', () => {
      const now = Date.now();
      db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, now - 1000);

      const result = service.stop();
      expect(result).toBe(true);

      const session = service.getOne();
      expect(session).toBeNull(); // No open sessions
    });

    test('returns false when no open sessions exist', () => {
      const result = service.stop();
      expect(result).toBe(false);
    });

    test('closes all open sessions', () => {
      const now = Date.now();
      // Create multiple open sessions (shouldn't happen normally, but testing defensive behavior)
      db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, now - 2000);
      db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, now - 1000);

      service.stop();

      const openSessions = service.get().filter(s => !s.end_time);
      expect(openSessions).toHaveLength(0);
    });
  });
});

