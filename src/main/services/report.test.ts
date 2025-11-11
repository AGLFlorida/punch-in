import { ReportService } from './report';
import { CompanyService } from './company';
import { ProjectService } from './project';
import { TaskService } from './task';
import { SessionService } from './session';
import { createMockDatabase } from '../../__tests__/helpers/mock-db';
import type { ReportModel } from './report';

describe('ReportService', () => {
  let db: ReturnType<typeof createMockDatabase>;
  let service: ReportService;
  let testTaskId: number;

  beforeEach(() => {
    db = createMockDatabase();
    // Services are created to set up test data
    void new CompanyService(db);
    void new ProjectService(db);
    void new TaskService(db);
    void new SessionService(db);
    service = new ReportService(db);

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

    test('returns reports for completed sessions', () => {
      const now = Date.now();
      const startTime = now - 3600000; // 1 hour ago
      const endTime = now - 1800000; // 30 minutes ago (30 min session)

      // Create a completed session
      db.prepare('INSERT INTO session (task_id, start_time, end_time) VALUES (?, ?, ?)').run(testTaskId, startTime, endTime);

      const result = service.get();
      expect(result.length).toBeGreaterThan(0);
      
      // Find the report for our task
      const taskReport = result.find(r => r.task_name === 'Test Task');
      expect(taskReport).not.toBeUndefined();
      expect(taskReport?.company_name).toBe('Test Company');
      expect(taskReport?.project_name).toBe('Test Project');
    });

    test('does not include open sessions in reports', () => {
      const now = Date.now();
      // Create an open session
      db.prepare('INSERT INTO session (task_id, start_time) VALUES (?, ?)').run(testTaskId, now);

      const result = service.get();
      // Open sessions should not appear in the report view
      const openSessionReport = result.find(r => r.task_name === 'Test Task' && !r.day);
      expect(openSessionReport).toBeUndefined();
    });

    test('orders reports by total_hours DESC', () => {
      const now = Date.now();
      
      // Create task 2 with longer session
      // Get the project ID from the existing test data
      const projectRow = db.prepare('SELECT id FROM project LIMIT 1').get() as { id: number } | undefined;
      if (!projectRow) {
        throw new Error('Test setup failed: no project found');
      }
      const task2Insert = db.prepare('INSERT INTO task (name, project_id) VALUES (?, ?)').run('Task 2', projectRow.id);
      const task2Id = task2Insert.lastInsertRowid as number;

      // Short session for task 1
      db.prepare('INSERT INTO session (task_id, start_time, end_time) VALUES (?, ?, ?)').run(testTaskId, now - 3600000, now - 3300000);
      
      // Long session for task 2
      db.prepare('INSERT INTO session (task_id, start_time, end_time) VALUES (?, ?, ?)').run(task2Id, now - 7200000, now - 3600000);

      const result = service.get();
      // Task 2 should come first due to more hours
      expect(result[0].total_seconds).toBeGreaterThan(result[1]?.total_seconds || 0);
    });
  });

  describe('set', () => {
    test('is a no-op that returns true', () => {
      const data: ReportModel[] = [];
      const result = service.set(data);
      expect(result).toBe(true);
    });
  });

  describe('getOne', () => {
    test('is a no-op that returns empty object', () => {
      const result = service.getOne();
      expect(result).toEqual({});
    });
  });
});

