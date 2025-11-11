import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from './Sidebar';

// Mock Next.js components
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/timer'),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement('img', props);
  },
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return React.createElement('a', { href }, children);
  };
});

// Mock CustomImage icons
jest.mock('./CustomImage', () => ({
  ClockIcon: () => React.createElement('svg', { 'data-testid': 'clock-icon' }),
  GearIcon: () => React.createElement('svg', { 'data-testid': 'gear-icon' }),
  ReportIcon: () => React.createElement('svg', { 'data-testid': 'report-icon' }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('renders sidebar with navigation links', () => {
    render(<Sidebar><div>Test Content</div></Sidebar>);

    expect(screen.getByText('Punch In')).toBeInTheDocument();
    expect(screen.getByText('Timer')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('renders icons', () => {
    render(<Sidebar><div>Test</div></Sidebar>);

    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('report-icon')).toBeInTheDocument();
    expect(screen.getByTestId('gear-icon')).toBeInTheDocument();
  });

  test('loads collapsed state from localStorage', async () => {
    localStorage.setItem('sidebarCollapsed', 'true');
    render(<Sidebar><div>Test</div></Sidebar>);

    await waitFor(() => {
      const container = screen.getByText('Punch In').closest('.app')?.parentElement;
      expect(container?.className).toContain('collapsed');
    });
  });

  test('saves collapsed state to localStorage when toggled', async () => {
    render(<Sidebar><div>Test</div></Sidebar>);

    const toggleButton = screen.getByText('<');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(localStorage.getItem('sidebarCollapsed')).toBe('true');
    });
  });

  test('toggles collapsed state when logo is clicked', async () => {
    render(<Sidebar><div>Test</div></Sidebar>);

    const logo = screen.getByAltText('Punch In Logo');
    fireEvent.click(logo);

    await waitFor(() => {
      expect(localStorage.getItem('sidebarCollapsed')).toBe('true');
    });
  });

  test('hides text when collapsed', async () => {
    localStorage.setItem('sidebarCollapsed', 'true');
    render(<Sidebar><div>Test</div></Sidebar>);

    // Text should still be in DOM but might be hidden via CSS
    // We can check that the collapsed class is applied
    await waitFor(() => {
      const container = screen.getByText('Punch In').closest('.app')?.parentElement;
      expect(container?.className).toContain('collapsed');
    });
  });

  test('shows toggle button when not collapsed', () => {
    render(<Sidebar><div>Test</div></Sidebar>);

    expect(screen.getByText('<')).toBeInTheDocument();
  });

  test('hides toggle button when collapsed', async () => {
    localStorage.setItem('sidebarCollapsed', 'true');
    render(<Sidebar><div>Test</div></Sidebar>);

    await waitFor(() => {
      expect(screen.queryByText('<')).not.toBeInTheDocument();
    });
  });
});

