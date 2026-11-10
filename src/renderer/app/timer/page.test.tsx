import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TimerPage from './page';
import type { TaskModel } from '../../../main/services/task';

// Mock NavigationGuard
jest.mock('@/components/NavigationGuard', () => ({
  useNavigationGuard: () => ({
    registerGuard: jest.fn(),
    unregisterGuard: jest.fn(),
    checkGuard: jest.fn(() => Promise.resolve(true)),
  }),
}));

// Mock Notify component
jest.mock('@/components/Notify', () => ({
  NotifyBox: () => null,
}));

// Shared mock tp factory — reset between tests
const makeMockTp = (tasks: TaskModel[] = [], running = false) => ({
  getTasks: jest.fn(() => Promise.resolve(tasks)),
  getProjectList: jest.fn(() => Promise.resolve([])),
  getState: jest.fn(() => Promise.resolve({ running })),
  start: jest.fn(() => Promise.resolve(10)),
  stop: jest.fn(() => Promise.resolve(true)),
});

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

describe('TimerPage – new task ID preservation', () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).tp;
    jest.clearAllMocks();
  });

  test('start called twice in new-task mode does not invoke tp.start with an id-less task on second call', async () => {
    const user = userEvent.setup();
    let capturedTask: TaskModel | null = null;

    const mockTp = {
      getTasks: jest.fn(() => Promise.resolve([])),
      getProjectList: jest.fn(() => Promise.resolve([{ id: 1, name: 'Proj', company_id: 1 }])),
      getState: jest.fn(() => Promise.resolve({ running: false })),
      // First call: returns task id 42
      start: jest.fn((task: TaskModel) => {
        capturedTask = task;
        return Promise.resolve(42);
      }),
      stop: jest.fn(() => Promise.resolve(true)),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).tp = mockTp;

    render(<TimerPage />);

    await waitFor(() => expect(mockTp.getTasks).toHaveBeenCalled());

    // Type task name
    const taskNameInput = screen.getByPlaceholderText('enter task name');
    await user.type(taskNameInput, 'Work Item');

    // Select a project — when newTask is true, the page renders two <select>s:
    // index 0 = task select ("Select a task"), index 1 = project select ("Select a project")
    const combos = screen.getAllByRole('combobox');
    const projectCombo = combos[combos.length - 1]; // project select is last
    await user.selectOptions(projectCombo, '1');

    // Click Start
    const startBtn = screen.getByRole('button', { name: /start/i });
    await user.click(startBtn);

    await waitFor(() => expect(mockTp.start).toHaveBeenCalledTimes(1));

    // After first start, capturedTask should NOT have an id (new task)
    // but after the call, the task id should be set to 42
    expect(capturedTask).not.toBeNull();

    // Click Stop
    const stopBtn = screen.getByRole('button', { name: /stop/i });
    await user.click(stopBtn);

    await waitFor(() => expect(mockTp.stop).toHaveBeenCalledTimes(1));

    // Click Start again — second start should preserve the task id (42)
    // so tp.start is called with { id: 42, ... } instead of { id: undefined, ... }
    await user.click(startBtn);

    await waitFor(() => expect(mockTp.start).toHaveBeenCalledTimes(2));

    const secondCallTask = mockTp.start.mock.calls[1][0] as TaskModel;
    // The second call should carry the id from the first start (42),
    // preventing a brand-new task from being created
    expect(secondCallTask.id).toBe(42);
  });
});
