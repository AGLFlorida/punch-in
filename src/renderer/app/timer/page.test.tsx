import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimerPage from './page';

// Mock window.tp
const mockGetTasks = jest.fn(() => Promise.resolve([]));
const mockGetProjectList = jest.fn(() => Promise.resolve([]));
const mockGetState = jest.fn(() =>
  Promise.resolve({ running: false, startTs: null, currentTask: null })
);
const mockStart = jest.fn(() => Promise.resolve(1));
const mockStop = jest.fn(() => Promise.resolve(true));

Object.defineProperty(window, 'tp', {
  value: {
    getTasks: mockGetTasks,
    getProjectList: mockGetProjectList,
    getState: mockGetState,
    start: mockStart,
    stop: mockStop,
  },
  writable: true,
  configurable: true,
});

// Mock Notify component
jest.mock('@/components/Notify', () => ({
  NotifyBox: () => null,
}));

const PROJECT_LIST = [{ id: 1, name: 'Project A', company_id: 1 }];

describe('TimerPage – task name validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTasks.mockResolvedValue([]);
    mockGetProjectList.mockResolvedValue(PROJECT_LIST);
    mockGetState.mockResolvedValue({ running: false, startTs: null, currentTask: null });
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
});
