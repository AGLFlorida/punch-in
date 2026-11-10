import { TaskService } from './task';
import { CompanyService } from './company';
import { ProjectService } from './project';
import { createMockDatabase } from '../../__tests__/helpers/mock-db';
import type { TaskModel } from './task';

describe('TaskService', () => {
  let db: ReturnType<typeof createMockDatabase>;
  let service: TaskService;
  let testProjectId: number;

  beforeEach(() => {
    db = createMockDatabase();
    // Services are created to set up test data
    void new CompanyService(db);
    void new ProjectService(db);
    service = new TaskService(db);

    // Create test company and project
    const companyInsert = db.prepare('INSERT INTO company (name) VALUES (?)').run('Test Company');
    const companyId = companyInsert.lastInsertRowid as number;
    const projectInsert = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Test Project', companyId);
    testProjectId = projectInsert.lastInsertRowid as number;
  });

  afterEach(() => {
    db.close();
  });

  describe('get', () => {
    test('returns empty array when no tasks exist', () => {
      const result = service.get();
      expect(result).toEqual([]);
    });

    test('returns only active tasks', () => {
      db.prepare('INSERT INTO task (name, project_id, is_active) VALUES (?, ?, ?)').run('Task 1', testProjectId, 1);
      db.prepare('INSERT INTO task (name, project_id, is_active) VALUES (?, ?, ?)').run('Task 2', testProjectId, 0);
      db.prepare('INSERT INTO task (name, project_id, is_active) VALUES (?, ?, ?)').run('Task 3', testProjectId, 1);

      const result = service.get();
      expect(result).toHaveLength(2);
      expect(result.map(t => t.name)).toContain('Task 1');
      expect(result.map(t => t.name)).toContain('Task 3');
      expect(result.map(t => t.name)).not.toContain('Task 2');
    });

    test('returns tasks ordered by id DESC', () => {
      db.prepare('INSERT INTO task (name, project_id) VALUES (?, ?)').run('First', testProjectId);
      db.prepare('INSERT INTO task (name, project_id) VALUES (?, ?)').run('Second', testProjectId);
      db.prepare('INSERT INTO task (name, project_id) VALUES (?, ?)').run('Third', testProjectId);

      const result = service.get();
      expect(result[0].name).toBe('Third');
      expect(result[1].name).toBe('Second');
      expect(result[2].name).toBe('First');
    });
  });

  describe('getOne', () => {
    test('returns empty task object', () => {
      const result = service.getOne();
      expect(result).toEqual({});
    });
  });

  describe('set', () => {
    test('throws error when project_id is missing', () => {
      const tasks: TaskModel[] = [
        { name: 'Task Without Project' } as TaskModel,
      ];

      expect(() => service.set(tasks)).toThrow('Project ID is required for new tasks.');
    });

    test('creates new task with project_id', () => {
      const tasks: TaskModel[] = [
        { name: 'New Task', project_id: testProjectId } as TaskModel,
      ];

      const result = service.set(tasks);
      expect(result).toBe(true);

      const all = service.get();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('New Task');
      expect(all[0].project_id).toBe(testProjectId);
    });

    test('updates lastTaskId after creating task', () => {
      const tasks: TaskModel[] = [
        { name: 'New Task', project_id: testProjectId } as TaskModel,
      ];

      service.set(tasks);
      const lastId = service.getLastTaskId();
      expect(lastId).toBeGreaterThan(0);
    });

    test('returns true without inserting when same name and project submitted twice', () => {
      const tasks1: TaskModel[] = [
        { name: 'Duplicate Task', project_id: testProjectId } as TaskModel,
      ];
      const tasks2: TaskModel[] = [
        { name: 'Duplicate Task', project_id: testProjectId } as TaskModel,
      ];

      service.set(tasks1);
      const result = service.set(tasks2);
      // The dedup guard returns the existing row before reaching INSERT,
      // so the second call returns true but inserts nothing.
      expect(result).toBe(true);

      const all = service.get();
      // Only one row exists — the second set() was a no-op at the DB level.
      expect(all).toHaveLength(1);
    });

    test('returns existing task id when same name and project already exists (dedup)', () => {
      const task: TaskModel = { name: 'My Task', project_id: testProjectId } as TaskModel;

      service.set([task]);
      const firstId = service.getLastTaskId();
      expect(firstId).toBeGreaterThan(0);

      // Second set with same name+project should reuse existing task
      service.set([{ name: 'My Task', project_id: testProjectId } as TaskModel]);
      const secondId = service.getLastTaskId();

      // Must return the same task id — no duplicate row
      expect(secondId).toBe(firstId);
      expect(service.get()).toHaveLength(1);
    });

    test('creates a distinct task when project differs', () => {
      const companyInsert2 = db.prepare('INSERT INTO company (name) VALUES (?)').run('Other Company');
      const companyId2 = companyInsert2.lastInsertRowid as number;
      const projectInsert2 = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Other Project', companyId2);
      const otherProjectId = projectInsert2.lastInsertRowid as number;

      service.set([{ name: 'Shared Name', project_id: testProjectId } as TaskModel]);
      const id1 = service.getLastTaskId();

      service.set([{ name: 'Shared Name', project_id: otherProjectId } as TaskModel]);
      const id2 = service.getLastTaskId();

      expect(id1).not.toBe(id2);
      expect(service.get()).toHaveLength(2);
    });
  });

  describe('getLastTaskId', () => {
    test('returns -1 initially', () => {
      expect(service.getLastTaskId()).toBe(-1);
    });

    test('returns last inserted task id after set', () => {
      const tasks: TaskModel[] = [
        { name: 'New Task', project_id: testProjectId } as TaskModel,
      ];

      service.set(tasks);
      const lastId = service.getLastTaskId();
      expect(lastId).toBeGreaterThan(0);
    });
  });
});

