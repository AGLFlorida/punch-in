import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfigurePage from './page';

// Mock Next.js components
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock window.tp
const mockGetCompanyList = jest.fn(() => Promise.resolve([]));
const mockGetProjectList = jest.fn(() => Promise.resolve([]));
const mockSetCompanyList = jest.fn(() => Promise.resolve());
const mockSetProjectList = jest.fn(() => Promise.resolve());
const mockRemoveCompany = jest.fn(() => Promise.resolve());
const mockRemoveProject = jest.fn(() => Promise.resolve());

Object.defineProperty(window, 'tp', {
  value: {
    getCompanyList: mockGetCompanyList,
    getProjectList: mockGetProjectList,
    setCompanyList: mockSetCompanyList,
    setProjectList: mockSetProjectList,
    removeCompany: mockRemoveCompany,
    removeProject: mockRemoveProject,
  },
  writable: true,
  configurable: true,
});

// Mock NavigationGuard
const mockRegisterGuard = jest.fn();
const mockUnregisterGuard = jest.fn();
const mockCheckGuard = jest.fn(() => Promise.resolve(true));

jest.mock('@/components/NavigationGuard', () => ({
  useNavigationGuard: () => ({
    registerGuard: mockRegisterGuard,
    unregisterGuard: mockUnregisterGuard,
    checkGuard: mockCheckGuard,
  }),
}));

// Mock other components
jest.mock('@/components/Notify', () => ({
  NotifyBox: () => null,
}));

jest.mock('@/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, title, message, onConfirm, onCancel }: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{message}</div>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

jest.mock('@/components/CustomImage', () => ({
  TrashIcon: () => <svg data-testid="trash-icon" />,
}));

describe('ConfigurePage - Unsaved Changes Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCompanyList.mockResolvedValue([
      { id: 1, name: 'Company 1' },
      { id: 2, name: 'Company 2' },
    ]);
    mockGetProjectList.mockResolvedValue([
      { id: 1, name: 'Project 1', company_id: 1 },
    ]);
    mockSetCompanyList.mockResolvedValue(undefined);
    mockSetProjectList.mockResolvedValue(undefined);
    mockRemoveCompany.mockResolvedValue(undefined);
    mockRemoveProject.mockResolvedValue(undefined);
  });

  test('registers navigation guard on mount', async () => {
    render(<ConfigurePage />);
    
    await waitFor(() => {
      expect(mockRegisterGuard).toHaveBeenCalled();
    });

    // Verify guard function was registered
    const guardFunction = mockRegisterGuard.mock.calls[0][0];
    expect(typeof guardFunction).toBe('function');
  });

  test('guard blocks navigation when company is added', async () => {
    render(<ConfigurePage />);
    
    // Wait for component to load and guard to be registered
    await waitFor(() => {
      expect(mockRegisterGuard).toHaveBeenCalled();
    });

    // Wait for data to load
    await waitFor(() => {
      expect(mockGetCompanyList).toHaveBeenCalled();
    });

    // Add a company
    const addButton = screen.getByText('+ Add company');
    fireEvent.click(addButton);

    // Wait for guard to be updated with new state
    await waitFor(() => {
      // Guard should have been called multiple times (initial + after state change)
      expect(mockRegisterGuard.mock.calls.length).toBeGreaterThan(0);
    });

    // Get the latest guard function
    const latestGuardCall = mockRegisterGuard.mock.calls[mockRegisterGuard.mock.calls.length - 1];
    const guardFunction = latestGuardCall[0];
    
    // Call guard with a navigation href, wrapped in act() to handle state updates
    let result: boolean;
    await act(async () => {
      result = await guardFunction('/timer');
    });
    
    // Should block navigation (return false) when there are unsaved changes
    expect(result!).toBe(false);
  });

  test('guard allows navigation when no changes are made', async () => {
    render(<ConfigurePage />);
    
    // Wait for component to load and guard to be registered
    await waitFor(() => {
      expect(mockRegisterGuard).toHaveBeenCalled();
    });

    // Wait for data to load
    await waitFor(() => {
      expect(mockGetCompanyList).toHaveBeenCalled();
    });

    // Wait a bit for snapshot to be set
    await waitFor(() => {
      // Guard should have been registered
      expect(mockRegisterGuard.mock.calls.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Get the latest guard function (after snapshot is set)
    const latestGuardCall = mockRegisterGuard.mock.calls[mockRegisterGuard.mock.calls.length - 1];
    const guardFunction = latestGuardCall[0];
    
    // Call guard with a navigation href, wrapped in act() to handle state updates
    let result: boolean;
    await act(async () => {
      result = await guardFunction('/timer');
    });
    
    // Should allow navigation (return true) when no changes
    expect(result!).toBe(true);
  });

  test('guard blocks navigation when company name is modified', async () => {
    render(<ConfigurePage />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(mockGetCompanyList).toHaveBeenCalled();
    });

    // Wait for companies to render
    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    // Modify first company name
    const companyInputs = screen.getAllByRole('textbox');
    const firstInput = companyInputs[0] as HTMLInputElement;
    fireEvent.change(firstInput, { target: { value: 'Modified Company' } });

    // Wait for guard to be updated
    await waitFor(() => {
      expect(mockRegisterGuard.mock.calls.length).toBeGreaterThan(0);
    });

    // Get the latest guard function
    const latestGuardCall = mockRegisterGuard.mock.calls[mockRegisterGuard.mock.calls.length - 1];
    const guardFunction = latestGuardCall[0];
    
    let result: boolean;
    await act(async () => {
      result = await guardFunction('/timer');
    });
    expect(result!).toBe(false);
  });

  test('unregisters guard on unmount', () => {
    const { unmount } = render(<ConfigurePage />);
    
    unmount();
    
    expect(mockUnregisterGuard).toHaveBeenCalled();
  });
});
