import { parseDateLocal, getMondayOfWeek, aggregateByWeek } from './reports';
import type { ReportModel } from '../../main/services/report';

describe('parseDateLocal', () => {
  it('returns a Date with the correct year, month, and day in local time', () => {
    const d = parseDateLocal('2024-01-15');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(15);
  });

  it('does not shift the date due to UTC offset (the UTC-midnight bug)', () => {
    // If new Date('2024-01-15') were used, timezones behind UTC would see Jan 14
    const d = parseDateLocal('2024-01-01');
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(0);
  });
});

describe('getMondayOfWeek', () => {
  it('returns the same date when the input is already a Monday', () => {
    // 2024-01-15 is a Monday
    const d = parseDateLocal('2024-01-15');
    expect(getMondayOfWeek(d)).toBe('2024-01-15');
  });

  it('returns the previous Monday for a Wednesday', () => {
    // 2024-01-17 is a Wednesday → Monday 2024-01-15
    const d = parseDateLocal('2024-01-17');
    expect(getMondayOfWeek(d)).toBe('2024-01-15');
  });

  it('returns the previous Monday for a Sunday', () => {
    // 2024-01-21 is a Sunday → Monday 2024-01-15
    const d = parseDateLocal('2024-01-21');
    expect(getMondayOfWeek(d)).toBe('2024-01-15');
  });

  it('returns the previous Monday for a Saturday', () => {
    // 2024-01-20 is a Saturday → Monday 2024-01-15
    const d = parseDateLocal('2024-01-20');
    expect(getMondayOfWeek(d)).toBe('2024-01-15');
  });

  it('returns the previous Monday for a Tuesday', () => {
    // 2024-01-16 is a Tuesday → Monday 2024-01-15
    const d = parseDateLocal('2024-01-16');
    expect(getMondayOfWeek(d)).toBe('2024-01-15');
  });
});

describe('aggregateByWeek', () => {
  const makeRow = (overrides: Partial<ReportModel>): ReportModel => ({
    company_name: 'Acme',
    project_name: 'Alpha',
    task_name: 'Dev',
    day: '2024-01-15',
    total_seconds: 3600,
    is_deleted: false,
    ...overrides,
  });

  it('sums sessions from multiple days in the same week into one row', () => {
    const rows: ReportModel[] = [
      makeRow({ day: '2024-01-15', total_seconds: 3600 }), // Mon
      makeRow({ day: '2024-01-17', total_seconds: 7200 }), // Wed
      makeRow({ day: '2024-01-19', total_seconds: 1800 }), // Fri
    ];
    const result = aggregateByWeek(rows);
    expect(result).toHaveLength(1);
    expect(result[0].total_seconds).toBe(12600);
  });

  it('keeps sessions from different weeks in separate rows', () => {
    const rows: ReportModel[] = [
      makeRow({ day: '2024-01-15', total_seconds: 3600 }), // Week 1 Mon
      makeRow({ day: '2024-01-22', total_seconds: 7200 }), // Week 2 Mon
    ];
    const result = aggregateByWeek(rows);
    expect(result).toHaveLength(2);
  });

  it('groups Sunday into the same week as the preceding Monday', () => {
    // Sunday 2024-01-21 belongs to the week starting 2024-01-15
    const rows: ReportModel[] = [
      makeRow({ day: '2024-01-15', total_seconds: 3600 }), // Mon
      makeRow({ day: '2024-01-21', total_seconds: 1800 }), // Sun
    ];
    const result = aggregateByWeek(rows);
    expect(result).toHaveLength(1);
    expect(result[0].total_seconds).toBe(5400);
    expect(result[0].week_start_date).toBe('2024-01-15');
  });

  it('keeps different projects in separate week rows', () => {
    const rows: ReportModel[] = [
      makeRow({ day: '2024-01-15', project_name: 'Alpha', total_seconds: 3600 }),
      makeRow({ day: '2024-01-15', project_name: 'Beta',  total_seconds: 7200 }),
    ];
    const result = aggregateByWeek(rows);
    expect(result).toHaveLength(2);
  });

  it('keeps different companies in separate week rows', () => {
    const rows: ReportModel[] = [
      makeRow({ day: '2024-01-15', company_name: 'Acme', total_seconds: 3600 }),
      makeRow({ day: '2024-01-15', company_name: 'Globex', total_seconds: 7200 }),
    ];
    const result = aggregateByWeek(rows);
    expect(result).toHaveLength(2);
  });

  it('sets week_start_date to the Monday ISO string', () => {
    const rows: ReportModel[] = [
      makeRow({ day: '2024-01-17', total_seconds: 3600 }), // Wed → week starts Mon Jan 15
    ];
    const result = aggregateByWeek(rows);
    expect(result[0].week_start_date).toBe('2024-01-15');
  });

  it('replaces day with a human-readable week range', () => {
    const rows: ReportModel[] = [makeRow({ day: '2024-01-15', total_seconds: 3600 })];
    const result = aggregateByWeek(rows);
    // day should be a range string, not a bare YYYY-MM-DD
    expect(result[0].day).toMatch(/Jan 15/);
    expect(result[0].day).toMatch(/Jan 21/);
  });

  it('clears task_name in aggregated rows', () => {
    const rows: ReportModel[] = [makeRow({ day: '2024-01-15', task_name: 'Some Task' })];
    const result = aggregateByWeek(rows);
    expect(result[0].task_name).toBe('');
  });

  it('skips a row with an empty day', () => {
    const rows = [makeRow({ day: '', total_seconds: 3600 })] as ReportModel[];
    const result = aggregateByWeek(rows);
    expect(result).toHaveLength(0);
  });

  it('skips a row with an empty project_name', () => {
    const rows = [makeRow({ project_name: '', total_seconds: 1800 })] as ReportModel[];
    const result = aggregateByWeek(rows);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(aggregateByWeek([])).toHaveLength(0);
  });
});
