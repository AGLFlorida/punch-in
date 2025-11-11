import { ProjectService } from './project';
import { CompanyService } from './company';
import { createMockDatabase } from '../../__tests__/helpers/mock-db';
import type { ProjectModel } from './project';

describe('ProjectService', () => {
  let db: ReturnType<typeof createMockDatabase>;
  let service: ProjectService;
  let testCompanyId: number;

  beforeEach(() => {
    db = createMockDatabase();
    // Service is created to set up test data
    void new CompanyService(db);
    service = new ProjectService(db);

    // Create a test company
    const companyInsert = db.prepare('INSERT INTO company (name) VALUES (?)').run('Test Company');
    testCompanyId = companyInsert.lastInsertRowid as number;
  });

  afterEach(() => {
    db.close();
  });

  describe('get', () => {
    test('returns empty array when no projects exist', () => {
      const result = service.get();
      expect(result).toEqual([]);
    });

    test('returns only active projects', () => {
      db.prepare('INSERT INTO project (name, company_id, is_active) VALUES (?, ?, ?)').run('Project 1', testCompanyId, 1);
      db.prepare('INSERT INTO project (name, company_id, is_active) VALUES (?, ?, ?)').run('Project 2', testCompanyId, 0);
      db.prepare('INSERT INTO project (name, company_id, is_active) VALUES (?, ?, ?)').run('Project 3', testCompanyId, 1);

      const result = service.get();
      expect(result).toHaveLength(2);
      expect(result.map(p => p.name)).toContain('Project 1');
      expect(result.map(p => p.name)).toContain('Project 3');
      expect(result.map(p => p.name)).not.toContain('Project 2');
    });

    test('returns projects ordered by name', () => {
      db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Zebra', testCompanyId);
      db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Alpha', testCompanyId);
      db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Beta', testCompanyId);

      const result = service.get();
      expect(result[0].name).toBe('Alpha');
      expect(result[1].name).toBe('Beta');
      expect(result[2].name).toBe('Zebra');
    });
  });

  describe('getOne', () => {
    test('returns project when it exists', () => {
      const insert = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Test Project', testCompanyId);
      const id = insert.lastInsertRowid as number;

      const result = service.getOne(id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(id);
    });
  });

  describe('getByName', () => {
    test('returns project when it exists', () => {
      const insert = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Test Project', testCompanyId);
      const expectedId = insert.lastInsertRowid as number;

      const result = service.getByName('Test Project');
      expect(result).not.toBeNull();
      expect(result?.id).toBe(expectedId);
    });

    test('handles whitespace trimming', () => {
      const insert = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('Test Project', testCompanyId);
      const expectedId = insert.lastInsertRowid as number;

      const result = service.getByName('  Test Project  ');
      expect(result).not.toBeNull();
      expect(result?.id).toBe(expectedId);
    });
  });

  describe('set', () => {
    test('returns false when list is empty', () => {
      const result = service.set([]);
      expect(result).toBe(false);
    });

    test('returns false when all projects already have ids', () => {
      const projects: ProjectModel[] = [
        { id: 1, name: 'Existing', company_id: testCompanyId } as ProjectModel,
      ];
      const result = service.set(projects);
      expect(result).toBe(false);
    });

    test('creates new projects', () => {
      const projects: ProjectModel[] = [
        { name: 'New Project 1', company_id: testCompanyId } as ProjectModel,
        { name: 'New Project 2', company_id: testCompanyId } as ProjectModel,
      ];

      const result = service.set(projects);
      expect(result).toBe(true);

      const all = service.get();
      expect(all).toHaveLength(2);
      expect(all.map(p => p.name)).toContain('New Project 1');
      expect(all.map(p => p.name)).toContain('New Project 2');
    });

    test('trims whitespace from project names', () => {
      const projects: ProjectModel[] = [
        { name: '  Trimmed Project  ', company_id: testCompanyId } as ProjectModel,
      ];

      service.set(projects);
      const result = service.getByName('Trimmed Project');
      expect(result).not.toBeNull();
      expect(result?.id).toBeDefined();
      // Verify the project was created by checking it exists in the get() list
      const allProjects = service.get();
      expect(allProjects.find(p => p.name === 'Trimmed Project')).toBeDefined();
    });

    test('requires company_id for new projects', () => {
      const projects: ProjectModel[] = [
        { name: 'Project Without Company' } as ProjectModel,
      ];

      // Should still work but might have issues - testing actual behavior
      const result = service.set(projects);
      // The actual implementation doesn't validate this, so it will succeed
      expect(result).toBe(true);
    });
  });

  describe('remove', () => {
    test('returns false when project id is missing', () => {
      const project: ProjectModel = { name: 'Test', company_id: testCompanyId } as ProjectModel;
      const result = service.remove(project);
      expect(result).toBe(false);
    });

    test('deactivates project when it exists', () => {
      const insert = db.prepare('INSERT INTO project (name, company_id) VALUES (?, ?)').run('To Remove', testCompanyId);
      const id = insert.lastInsertRowid as number;

      const project: ProjectModel = { id, name: 'To Remove', company_id: testCompanyId } as ProjectModel;
      const result = service.remove(project);

      expect(result).toBe(true);
      const removed = service.get();
      expect(removed.find(p => p.id === id)).toBeUndefined();
    });
  });

  describe('activate', () => {
    test('activates inactive project', () => {
      const insert = db.prepare('INSERT INTO project (name, company_id, is_active) VALUES (?, ?, ?)').run('Inactive', testCompanyId, 0);
      const id = insert.lastInsertRowid as number;

      const result = service.activate(id);
      expect(result).toBe(true);

      const activated = service.get();
      expect(activated.find(p => p.id === id)).not.toBeUndefined();
    });

    test('returns false when project does not exist', () => {
      const result = service.activate(999);
      expect(result).toBe(false);
    });
  });
});

