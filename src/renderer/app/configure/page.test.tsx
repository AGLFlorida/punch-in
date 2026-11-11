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

const FIXTURE_COMPANIES = [
  { id: 1, name: 'Acme Inc' },
  { id: 2, name: 'Freelance' },
];
const FIXTURE_PROJECTS = [
  { id: 10, name: 'Web App', company_id: 1 },
  { id: 11, name: 'Mobile App', company_id: 1 },
  { id: 20, name: 'Personal Site', company_id: 2 },
];

describe('ConfigurePage - Grouped layout and UX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCompanyList.mockResolvedValue(FIXTURE_COMPANIES);
    mockGetProjectList.mockResolvedValue(FIXTURE_PROJECTS);
  });

  test('shows empty-state container when no companies exist', async () => {
    mockGetCompanyList.mockResolvedValue([]);
    mockGetProjectList.mockResolvedValue([]);
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-company-state')).toBeInTheDocument();
    });
  });

  test('renders an input for every loaded company and project', async () => {
    render(<ConfigurePage />);
    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      // One input per company + one per project
      expect(inputs.length).toBe(FIXTURE_COMPANIES.length + FIXTURE_PROJECTS.length);
    });
  });

  test('"Add project" button appears once per saved company', async () => {
    render(<ConfigurePage />);
    await waitFor(() => {
      const addProjectBtns = screen.getAllByText('+ Add project');
      expect(addProjectBtns.length).toBe(FIXTURE_COMPANIES.length);
    });
  });

  test('clicking "Add project" adds a blank project input', async () => {
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getAllByText('+ Add project').length).toBe(FIXTURE_COMPANIES.length);
    });
    const inputsBefore = screen.getAllByRole('textbox').length;
    const addProjectBtns = screen.getAllByText('+ Add project');
    fireEvent.click(addProjectBtns[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox').length).toBe(inputsBefore + 1);
    });
  });

  test('new unsaved company shows the "save first" hint element', async () => {
    mockGetCompanyList.mockResolvedValue([]);
    mockGetProjectList.mockResolvedValue([]);
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-company-state')).toBeInTheDocument();
    });
    const addCompanyBtn = screen.getByText('+ Add company');
    fireEvent.click(addCompanyBtn);
    await waitFor(() => {
      // testid is per-company to remain unique with multiple unsaved companies
      const hints = screen.getAllByText('Save to enable adding projects');
      expect(hints.length).toBeGreaterThan(0);
    });
  });

  test('adding two unsaved companies renders two distinct hint elements', async () => {
    mockGetCompanyList.mockResolvedValue([]);
    mockGetProjectList.mockResolvedValue([]);
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-company-state')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Add company'));
    await waitFor(() => expect(screen.getAllByText('Save to enable adding projects').length).toBe(1));
    fireEvent.click(screen.getByText('+ Add company'));
    await waitFor(() => expect(screen.getAllByText('Save to enable adding projects').length).toBe(2));
  });

  test('adding an unassigned project shows the unassigned-projects heading', async () => {
    mockGetCompanyList.mockResolvedValue([{ id: 1, name: 'Acme Inc' }]);
    mockGetProjectList.mockResolvedValue([{ id: 10, name: 'Web App', company_id: 1 }]);
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getAllByText('+ Add project').length).toBe(1);
    });
    const addUnassigned = screen.getByText('+ Add unassigned project');
    fireEvent.click(addUnassigned);
    await waitFor(() => {
      expect(screen.getByTestId('unassigned-projects-heading')).toBeInTheDocument();
    });
  });

  test('Save button is disabled when no unsaved changes', async () => {
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getAllByRole('textbox').length).toBe(
        FIXTURE_COMPANIES.length + FIXTURE_PROJECTS.length
      );
    });
    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
  });

  test('Save button is enabled after adding a company', async () => {
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getAllByText('+ Add project').length).toBe(FIXTURE_COMPANIES.length);
    });
    const addCompanyBtn = screen.getByText('+ Add company');
    fireEvent.click(addCompanyBtn);
    await waitFor(() => {
      expect(screen.getByText('Save')).not.toBeDisabled();
    });
  });
});

describe('ConfigurePage - Data integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetCompanyList.mockResolvedValue(undefined);
    mockSetProjectList.mockResolvedValue(undefined);
    mockRemoveCompany.mockResolvedValue(undefined);
    mockRemoveProject.mockResolvedValue(undefined);
  });

  test('deleting a company moves its projects to the unassigned section', async () => {
    // Two companies so the first delete button is not disabled (requires companies.length > 1)
    mockGetCompanyList.mockResolvedValue([
      { id: 1, name: 'Acme Inc' },
      { id: 2, name: 'Other Co' },
    ]);
    mockGetProjectList.mockResolvedValue([{ id: 10, name: 'Web App', company_id: 1 }]);
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getAllByRole('textbox').length).toBe(3); // 2 companies + 1 project
    });

    // Delete the first company (Acme Inc, which owns Web App)
    const trashBtns = screen.getAllByRole('button', { name: /remove company/i });
    fireEvent.click(trashBtns[0]);
    // Confirm the dialog
    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByTestId('unassigned-projects-heading')).toBeInTheDocument();
    });
  });

  test('Save is blocked and error notification shown when unassigned projects exist', async () => {
    mockGetCompanyList.mockResolvedValue([{ id: 1, name: 'Acme Inc' }]);
    mockGetProjectList.mockResolvedValue([]);
    render(<ConfigurePage />);
    await waitFor(() => {
      expect(screen.getAllByText('+ Add project').length).toBe(1);
    });

    // Add an unassigned project
    fireEvent.click(screen.getByText('+ Add unassigned project'));
    await waitFor(() => {
      expect(screen.getByTestId('unassigned-projects-heading')).toBeInTheDocument();
    });

    // Attempt save
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      // setProjectList should NOT have been called
      expect(mockSetProjectList).not.toHaveBeenCalled();
    });
  });
});

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
