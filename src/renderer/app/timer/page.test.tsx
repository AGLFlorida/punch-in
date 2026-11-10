import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TimerPage from './page';
import type { TaskModel } from '../../../main/services/task';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/components/NavigationGuard', () => ({
  useNavigationGuard: () => ({
    registerGuard: jest.fn(),
    unregisterGuard: jest.fn(),
    checkGuard: jest.fn(() => Promise.resolve(true)),
  }),
}));

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

// Shared mock tp factory — reset between tests
const makeMockTp = (tasks: TaskModel[] = [], running = false) => ({
  getTasks: jest.fn(() => Promise.resolve(tasks)),
  getProjectList: jest.fn(() => Promise.resolve([])),
  getState: jest.fn(() => Promise.resolve({ running })),
  start: jest.fn(() => Promise.resolve(10)),
  stop: jest.fn(() => Promise.resolve(true)),
});

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
// Button states and start/stop interaction flows
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
// Task name validation
// ---------------------------------------------------------------------------

const PROJECT_LIST = [{ id: 1, name: 'Project A', company_id: 1 }];

describe('TimerPage – task name validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('shows character counter starting at 0/32', async () => {
    await renderAndWait();
    expect(screen.getByText('0/32')).toBeInTheDocument();
  });

  test('updates character counter as user types', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(screen.getByText('5/32')).toBeInTheDocument();
  });

  test('shows inline error when name exceeds 32 characters', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(33) } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert').textContent).toMatch(/32/);
    });
  });

  test('counter shows 33/32 and is in error state when over limit', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(33) } });
    expect(screen.getByText('33/32')).toBeInTheDocument();
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
    expect(screen.getByText('32/32')).toBeInTheDocument();
  });

  test('Start button is disabled when task name exceeds limit', async () => {
    await renderAndWait();
    const input = getTaskInput();
    fireEvent.change(input, { target: { value: 'a'.repeat(33) } });
    const startBtn = screen.getByRole('button', { name: /start/i });
    await waitFor(() => expect(startBtn).toBeDisabled());
  });

  test('Start button is disabled when task name is empty even with project selected', async () => {
    // Project must be loaded so the UI can show project options
    mockGetProjectList.mockResolvedValue(PROJECT_LIST);
    await renderAndWait();
    // Task name input starts empty; Start must remain disabled
    const startBtn = screen.getByRole('button', { name: /start/i });
    expect(startBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Task dropdown deduplication
// ---------------------------------------------------------------------------

describe('TimerPage – task dropdown deduplication', () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).tp;
    jest.clearAllMocks();
  });

  test('renders each task exactly once when API returns unique tasks', async () => {
    const tasks: TaskModel[] = [
      { id: 1, name: 'Task Alpha', project_id: 1 },
      { id: 2, name: 'Task Beta', project_id: 1 },
    ] as TaskModel[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).tp = makeMockTp(tasks);

    render(<TimerPage />);

    await waitFor(() => {
      expect(screen.queryAllByRole('option', { name: /Task Alpha/ })).toHaveLength(1);
      expect(screen.queryAllByRole('option', { name: /Task Beta/ })).toHaveLength(1);
    });
  });

  test('deduplicates when API returns tasks with duplicate ids', async () => {
    // Simulate pre-existing duplicate rows that could exist before the fix
    const tasks: TaskModel[] = [
      { id: 5, name: 'My Task', project_id: 1 },
      { id: 5, name: 'My Task', project_id: 1 }, // duplicate id
    ] as TaskModel[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).tp = makeMockTp(tasks);

    render(<TimerPage />);

    await waitFor(() => {
      // Should appear only once despite API returning two entries with same id
      expect(screen.queryAllByRole('option', { name: /My Task/ })).toHaveLength(1);
    });
  });

  test('remounting (simulating navigation) does not duplicate tasks', async () => {
    const tasks: TaskModel[] = [
      { id: 1, name: 'Persistent Task', project_id: 1 },
    ] as TaskModel[];

    const mockTp = makeMockTp(tasks);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).tp = mockTp;

    const { unmount } = render(<TimerPage />);

    await waitFor(() => {
      expect(screen.queryAllByRole('option', { name: /Persistent Task/ })).toHaveLength(1);
    });

    // Simulate navigating away and back by unmounting + remounting
    unmount();
    render(<TimerPage />);

    await waitFor(() => {
      // Still exactly one option after remount
      expect(screen.queryAllByRole('option', { name: /Persistent Task/ })).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// New task start behavior
// ---------------------------------------------------------------------------

describe('TimerPage – new task start behavior', () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).tp;
    jest.clearAllMocks();
  });

  test('second Start in new-task mode sends task without an explicit id so the service dedup guard can run', async () => {
    // The UI must NOT forward the id from the first Start onto the second call.
    // If it did, the session handler would skip taskSvc.set and log time against
    // the original task even when the user changed the name or project.
    // The service-layer dedup guard (TaskService.set) handles same-name reuse.
    const user = userEvent.setup();

    const mockTp = {
      getTasks: jest.fn(() => Promise.resolve([])),
      getProjectList: jest.fn(() => Promise.resolve([{ id: 1, name: 'Proj', company_id: 1 }])),
      getState: jest.fn(() => Promise.resolve({ running: false })),
      start: jest.fn(() => Promise.resolve(42)),
      stop: jest.fn(() => Promise.resolve(true)),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).tp = mockTp;

    render(<TimerPage />);

    await waitFor(() => expect(mockTp.getTasks).toHaveBeenCalled());

    // Type task name and select a project
    const taskNameInput = screen.getByPlaceholderText('enter task name');
    await user.type(taskNameInput, 'Work Item');

    // Select a project — when newTask is true, the page renders two <select>s:
    // index 0 = task select ("Select a task"), index 1 = project select ("Select a project")
    const combos = screen.getAllByRole('combobox');
    const projectCombo = combos[combos.length - 1]; // project select is last
    await user.selectOptions(projectCombo, '1');

    // First Start
    const startBtn = screen.getByRole('button', { name: /start/i });
    await user.click(startBtn);
    await waitFor(() => expect(mockTp.start).toHaveBeenCalledTimes(1));

    const firstCallTask = mockTp.start.mock.calls[0][0] as TaskModel;
    // First call should not have an id (new task, no existing id)
    expect(firstCallTask.id).toBeUndefined();

    // Click Stop
    const stopBtn = screen.getByRole('button', { name: /stop/i });
    await user.click(stopBtn);
    await waitFor(() => expect(mockTp.stop).toHaveBeenCalledTimes(1));

    // Second Start — must NOT carry the id=42 set after the first start.
    // The service dedup guard on the backend handles reuse by name+project_id.
    await user.click(startBtn);
    await waitFor(() => expect(mockTp.start).toHaveBeenCalledTimes(2));

    const secondCallTask = mockTp.start.mock.calls[1][0] as TaskModel;
    // Second call must not carry a stale id from the first call
    expect(secondCallTask.id).toBeUndefined();
  });
});
