import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimerPage from './page';
import { TASK_NAME_MAX_LEN } from '@/lib/validation';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/components/Notify', () => ({
  NotifyBox: () => null,
}));

const mockTasks = [
  { id: 1, name: 'Task Alpha', project_id: 10 },
  { id: 2, name: 'Task Beta', project_id: 20 },
];

const mockProjects = [
  { id: 10, name: 'Project X' },
  { id: 20, name: 'Project Y' },
];

const mockGetTasks = jest.fn(() => Promise.resolve(mockTasks));
const mockGetProjectList = jest.fn(() => Promise.resolve(mockProjects));
const mockGetState = jest.fn(() => Promise.resolve({ running: false, startTs: null, currentTask: {} }));
const mockStart = jest.fn(() => Promise.resolve(99));
const mockStop = jest.fn(() => Promise.resolve(true));

function setupWindowTp(overrides: Partial<typeof window.tp> = {}) {
  Object.defineProperty(window, 'tp', {
    value: {
      getTasks: mockGetTasks,
      getProjectList: mockGetProjectList,
      getState: mockGetState,
      start: mockStart,
      stop: mockStop,
      ...overrides,
    },
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function clearTimerStorage() {
  localStorage.removeItem('timer-selectedTaskId');
  localStorage.removeItem('timer-selectedProjectId');
  localStorage.removeItem('timer-taskName');
  localStorage.removeItem('timer-newTask');
}

function seedTimerStorage(taskId: number | '', projectId: number | '', taskName: string, newTask: boolean) {
  localStorage.setItem('timer-selectedTaskId', String(taskId));
  localStorage.setItem('timer-selectedProjectId', String(projectId));
  localStorage.setItem('timer-taskName', taskName);
  localStorage.setItem('timer-newTask', String(newTask));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  clearTimerStorage();
  setupWindowTp();
});

afterEach(() => {
  clearTimerStorage();
});

// ---------------------------------------------------------------------------
// State restoration after navigation (from PR #54)
// ---------------------------------------------------------------------------

describe('TimerPage – state restoration after navigation', () => {
  test('restores previously selected existing task on remount (AC #1 – existing task)', async () => {
    // Simulate: user had Task Alpha selected before navigating away
    seedTimerStorage(1, 10, '', false);

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      const taskSelect = screen.getByRole<HTMLSelectElement>('combobox');
      expect(taskSelect.value).toBe('1');
    });
  });

  test('restores previously entered new-task name and project on remount (AC #1 – new task)', async () => {
    seedTimerStorage('', 10, 'My new task', true);

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('enter task name')).toHaveValue('My new task');
      const selects = screen.getAllByRole<HTMLSelectElement>('combobox');
      const projectSelect = selects.find(s => s.value === '10');
      expect(projectSelect).toBeDefined();
    });
  });

  test('running timer is restored with correct elapsed time on remount (AC #2)', async () => {
    const startTs = Date.now() - 5000; // 5 seconds ago
    mockGetState.mockResolvedValueOnce({
      running: true,
      startTs,
      currentTask: { id: 1, name: 'Task Alpha', project_id: 10 },
    });

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Elapsed should be ~5 s – hours and minutes must both be 00
    const elapsed = screen.getByText(/\d+:\d\d:\d\d/);
    expect(elapsed.textContent).toMatch(/00:00:\d\d/);
  });

  test('running timer restored even when currentTask.id is missing (AC #2 – edge case)', async () => {
    const startTs = Date.now() - 2000;
    // State has running session but getOne returned empty task (task deleted)
    mockGetState.mockResolvedValueOnce({
      running: true,
      startTs,
      currentTask: {},
    });

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  test('navigating away and back does not create duplicate entries (AC #3 – stop does not auto-start)', async () => {
    // Simulate timer not running
    mockGetState.mockResolvedValue({ running: false, startTs: null, currentTask: {} });

    // First mount
    const { unmount } = await act(async () => render(<TimerPage />));
    await waitFor(() => expect(mockGetState).toHaveBeenCalledTimes(1));

    unmount();

    // Second mount (simulates navigating back)
    await act(async () => { render(<TimerPage />); });
    await waitFor(() => expect(mockGetState).toHaveBeenCalledTimes(2));

    // start should never have been called automatically
    expect(mockStart).not.toHaveBeenCalled();
  });

  test('localStorage is not consulted when a running session is active', async () => {
    // Seed stale localStorage pointing at task 2
    seedTimerStorage(2, 20, '', false);

    const startTs = Date.now() - 3000;
    mockGetState.mockResolvedValueOnce({
      running: true,
      startTs,
      currentTask: { id: 1, name: 'Task Alpha', project_id: 10 },
    });

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
      // Task Alpha (id:1) should be selected, not the stale task 2
      const selects = screen.getAllByRole<HTMLSelectElement>('combobox');
      const taskSelect = selects.find(s => s.options.length > 1);
      expect(taskSelect?.value).toBe('1');
    });
  });

  test('falls back to empty state when saved task no longer exists in list', async () => {
    // Seed task id 999 which is not in mockTasks
    seedTimerStorage(999, 10, '', false);
    mockGetState.mockResolvedValueOnce({ running: false, startTs: null, currentTask: {} });

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      // Task select is the first combobox; there may be a second (project) visible in new-task mode
      const [taskSelect] = screen.getAllByRole<HTMLSelectElement>('combobox');
      expect(taskSelect.value).toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// Button states and start/stop interaction flows (from PR #54)
// ---------------------------------------------------------------------------

describe('TimerPage – button states and start/stop flows', () => {
  test('Start button is disabled when no task is selected', async () => {
    await act(async () => {
      render(<TimerPage />);
    });

    // After load with no saved selection, allowStart is false
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    });
  });

  test('Stop button is disabled when timer is idle', async () => {
    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    });
  });

  test('selecting an existing task from the dropdown enables the Start button', async () => {
    await act(async () => {
      render(<TimerPage />);
    });

    // Task select is first combobox; tasks are loaded after mount
    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
    });

    // Pick Task Alpha (id 1)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    });
  });

  test('clicking Start calls window.tp.start and transitions status to Running', async () => {
    // Restore a known task so Start is enabled immediately after mount
    seedTimerStorage(1, 10, '', false);

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    });

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  test('clicking Stop calls window.tp.stop and transitions status to Idle', async () => {
    const startTs = Date.now() - 2000;
    mockGetState.mockResolvedValueOnce({
      running: true,
      startTs,
      currentTask: { id: 1, name: 'Task Alpha', project_id: 10 },
    });

    await act(async () => {
      render(<TimerPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    });

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Idle')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Task name validation (from PR #55)
// ---------------------------------------------------------------------------

describe('TimerPage – task name validation', () => {
  const PROJECT_LIST = [{ id: 1, name: 'Project A', company_id: 1 }];

  beforeEach(() => {
    jest.clearAllMocks();
    clearTimerStorage();
    mockGetTasks.mockResolvedValue([]);
    mockGetProjectList.mockResolvedValue(PROJECT_LIST);
    mockGetState.mockResolvedValue({ running: false, startTs: null, currentTask: null });
    setupWindowTp();
  });

  async function renderAndWait() {
    await act(async () => {
      render(<TimerPage />);
    });
  }

  function getTaskInput() {
    return screen.getByPlaceholderText('enter task name');
  }

  test('renders task name input in new-task mode', async () => {
    await renderAndWait();
    expect(getTaskInput()).toBeInTheDocument();
  });

  test('shows character counter starting at 0', async () => {
    await renderAndWait();
    expect(screen.getByText(`0/${TASK_NAME_MAX_LEN}`)).toBeInTheDocument();
  });

  test('updates character counter as user types', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(screen.getByText(`5/${TASK_NAME_MAX_LEN}`)).toBeInTheDocument();
  });

  test('shows inline error when name exceeds 32 characters', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(33) } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert').textContent).toMatch(new RegExp(String(TASK_NAME_MAX_LEN)));
    });
  });

  test('counter shows over-limit count and is in error state when over limit', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(TASK_NAME_MAX_LEN + 1) } });
    expect(screen.getByText(`${TASK_NAME_MAX_LEN + 1}/${TASK_NAME_MAX_LEN}`)).toBeInTheDocument();
  });

  test('shows inline error for control characters', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'bad\x00name' } });
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/disallowed/i);
    });
  });

  test('clears error when corrected to valid name', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(33) } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    fireEvent.change(input, { target: { value: 'Valid name' } });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  test('no error shown for a valid name at exact limit', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(32) } });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByText(`${TASK_NAME_MAX_LEN}/${TASK_NAME_MAX_LEN}`)).toBeInTheDocument();
  });

  test('Start button is disabled when task name exceeds limit', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(33) } });
    const startBtn = screen.getByRole('button', { name: /start/i });
    await waitFor(() => expect(startBtn).toBeDisabled());
  });

  test('Start button is disabled when task name is empty even with project selected', async () => {
    mockGetProjectList.mockResolvedValue(PROJECT_LIST);
    await renderAndWait();
    // Task name input starts empty; Start must remain disabled
    const startBtn = screen.getByRole('button', { name: /start/i });
    expect(startBtn).toBeDisabled();
  });
});
