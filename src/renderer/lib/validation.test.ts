import { validateTaskName, TASK_NAME_MAX_LEN } from './validation';

describe('validateTaskName', () => {
  test('returns null for a valid short name', () => {
    expect(validateTaskName('My Task')).toBeNull();
  });

  test('returns null for a name exactly at the limit', () => {
    const exactly32 = 'a'.repeat(32);
    expect(validateTaskName(exactly32)).toBeNull();
  });

  test('returns error for a name exceeding 32 characters', () => {
    const too_long = 'a'.repeat(33);
    expect(validateTaskName(too_long)).toMatch(/32/);
  });

  test('returns error for an empty string', () => {
    expect(validateTaskName('')).not.toBeNull();
  });

  test('returns error for a whitespace-only string', () => {
    expect(validateTaskName('   ')).not.toBeNull();
  });

  test('returns error for a name containing a null byte', () => {
    expect(validateTaskName('task\x00name')).toMatch(/disallowed/i);
  });

  test('returns error for a name containing a control character (tab)', () => {
    expect(validateTaskName('task\tname')).toMatch(/disallowed/i);
  });

  test('returns error for a name containing a newline', () => {
    expect(validateTaskName('task\nname')).toMatch(/disallowed/i);
  });

  test('returns error for a name containing DEL (0x7F)', () => {
    expect(validateTaskName('task\x7fname')).toMatch(/disallowed/i);
  });

  test('returns null for a name with normal special chars (hyphens, parens)', () => {
    expect(validateTaskName('Fix bug (issue-45)')).toBeNull();
  });

  test('returns null for a name with unicode letters', () => {
    expect(validateTaskName('Tâche 1')).toBeNull();
  });

});
