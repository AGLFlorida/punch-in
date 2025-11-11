import { CompanyService } from './company';
import { createMockDatabase } from '../../__tests__/helpers/mock-db';
import type { CompanyModel } from './company';

describe('CompanyService', () => {
  let db: ReturnType<typeof createMockDatabase>;
  let service: CompanyService;

  beforeEach(() => {
    db = createMockDatabase();
    service = new CompanyService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('get', () => {
    test('returns empty array when no companies exist', () => {
      const result = service.get();
      expect(result).toEqual([]);
    });

    test('returns only active companies', () => {
      // Insert test data
      db.prepare('INSERT INTO company (name, is_active) VALUES (?, ?)').run('Company 1', 1);
      db.prepare('INSERT INTO company (name, is_active) VALUES (?, ?)').run('Company 2', 0);
      db.prepare('INSERT INTO company (name, is_active) VALUES (?, ?)').run('Company 3', 1);

      const result = service.get();
      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toContain('Company 1');
      expect(result.map(c => c.name)).toContain('Company 3');
      expect(result.map(c => c.name)).not.toContain('Company 2');
    });

    test('returns companies ordered by id DESC', () => {
      db.prepare('INSERT INTO company (name) VALUES (?)').run('First');
      db.prepare('INSERT INTO company (name) VALUES (?)').run('Second');
      db.prepare('INSERT INTO company (name) VALUES (?)').run('Third');

      const result = service.get();
      expect(result[0].name).toBe('Third');
      expect(result[1].name).toBe('Second');
      expect(result[2].name).toBe('First');
    });
  });

  describe('getOne', () => {
    test('returns null when company does not exist', () => {
      const result = service.getOne(999);
      expect(result).toBeNull();
    });

    test('returns company when it exists and is active', () => {
      const insert = db.prepare('INSERT INTO company (name) VALUES (?)').run('Test Company');
      const id = insert.lastInsertRowid as number;

      const result = service.getOne(id);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Company');
      expect(result?.id).toBe(id);
    });

    test('returns null when company is inactive', () => {
      const insert = db.prepare('INSERT INTO company (name, is_active) VALUES (?, ?)').run('Inactive', 0);
      const id = insert.lastInsertRowid as number;

      const result = service.getOne(id);
      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    test('returns null when company does not exist', () => {
      const result = service.getByName('NonExistent');
      expect(result).toBeNull();
    });

    test('returns company when it exists', () => {
      db.prepare('INSERT INTO company (name) VALUES (?)').run('Test Company');

      const result = service.getByName('Test Company');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Company');
    });

    test('handles whitespace trimming', () => {
      db.prepare('INSERT INTO company (name) VALUES (?)').run('Test Company');

      const result = service.getByName('  Test Company  ');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Company');
    });
  });

  describe('set', () => {
    test('returns false when list is empty', () => {
      const result = service.set([]);
      expect(result).toBe(false);
    });

    test('returns false when all companies already have ids', () => {
      const companies: CompanyModel[] = [
        { id: 1, name: 'Existing' } as CompanyModel,
        { id: 2, name: 'Another' } as CompanyModel,
      ];
      const result = service.set(companies);
      expect(result).toBe(false);
    });

    test('creates new companies', () => {
      const companies: CompanyModel[] = [
        { name: 'New Company 1' } as CompanyModel,
        { name: 'New Company 2' } as CompanyModel,
      ];

      const result = service.set(companies);
      expect(result).toBe(true);

      const all = service.get();
      expect(all).toHaveLength(2);
      expect(all.map(c => c.name)).toContain('New Company 1');
      expect(all.map(c => c.name)).toContain('New Company 2');
    });

    test('trims whitespace from company names', () => {
      const companies: CompanyModel[] = [
        { name: '  Trimmed Company  ' } as CompanyModel,
      ];

      service.set(companies);
      const result = service.getByName('Trimmed Company');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Trimmed Company');
    });

    test('activates existing companies with same name', () => {
      // Create inactive company
      const insert = db.prepare('INSERT INTO company (name, is_active) VALUES (?, ?)').run('Existing', 0);
      const id = insert.lastInsertRowid as number;

      // Try to add same company
      const companies: CompanyModel[] = [
        { name: 'Existing' } as CompanyModel,
      ];

      service.set(companies);

      // Company should be activated
      const result = service.getOne(id);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Existing');
    });
  });

  describe('remove', () => {
    test('returns false when company id is missing', () => {
      const company: CompanyModel = { name: 'Test' } as CompanyModel;
      const result = service.remove(company);
      expect(result).toBe(false);
    });

    test('deactivates company when it exists', () => {
      const insert = db.prepare('INSERT INTO company (name) VALUES (?)').run('To Remove');
      const id = insert.lastInsertRowid as number;

      const company: CompanyModel = { id, name: 'To Remove' } as CompanyModel;
      const result = service.remove(company);

      expect(result).toBe(true);
      const removed = service.getOne(id);
      expect(removed).toBeNull(); // Should not be in active list
    });

    test('returns false when company does not exist', () => {
      const company: CompanyModel = { id: 999, name: 'NonExistent' } as CompanyModel;
      const result = service.remove(company);
      expect(result).toBe(false);
    });
  });

  describe('activate', () => {
    test('activates inactive company', () => {
      const insert = db.prepare('INSERT INTO company (name, is_active) VALUES (?, ?)').run('Inactive', 0);
      const id = insert.lastInsertRowid as number;

      const result = service.activate(id);
      expect(result).toBe(true);

      const activated = service.getOne(id);
      expect(activated).not.toBeNull();
      expect(activated?.name).toBe('Inactive');
    });

    test('returns false when company does not exist', () => {
      const result = service.activate(999);
      expect(result).toBe(false);
    });
  });

  describe('toCompanyModel', () => {
    test('converts string array to CompanyModel array', () => {
      const strings = ['Company 1', 'Company 2', 'Company 3'];
      const result = service.toCompanyModel(strings);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Company 1');
      expect(result[1].name).toBe('Company 2');
      expect(result[2].name).toBe('Company 3');
    });

    test('trims whitespace from names', () => {
      const strings = ['  Company 1  ', '  Company 2  '];
      const result = service.toCompanyModel(strings);

      expect(result[0].name).toBe('Company 1');
      expect(result[1].name).toBe('Company 2');
    });

    test('filters out empty strings', () => {
      const strings = ['Company 1', '', '   ', 'Company 2'];
      const result = service.toCompanyModel(strings);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Company 1');
      expect(result[1].name).toBe('Company 2');
    });
  });
});

