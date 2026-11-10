/** Maximum allowed length for a task name, matching the DB constraint. */
export const TASK_NAME_MAX_LEN = 32;

/**
 * Returns true if the character is a control character that should be
 * disallowed in task names (ASCII 0-31 and DEL 127).
 */
function hasControlChars(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x1F\x7F]/.test(value);
}

/**
 * Validates a task name against the DB constraints and input rules.
 *
 * @returns `null` when valid, or an error message string when invalid.
 */
export function validateTaskName(name: string): string | null {
  if (!name || !name.trim()) {
    return 'Task name is required.';
  }
  if (hasControlChars(name)) {
    return 'Task name contains disallowed characters.';
  }
  if (name.length > TASK_NAME_MAX_LEN) {
    return `Task name must be ${TASK_NAME_MAX_LEN} characters or fewer.`;
  }
  return null;
}
