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
