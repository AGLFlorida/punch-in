import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from './Sidebar';

// Mock Next.js components
const mockUsePathname = jest.fn(() => '/timer');
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement('img', props);
  },
}));

jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return React.createElement('a', { href, ...props }, children);
  };
});

// Mock CustomImage icons
jest.mock('./CustomImage', () => ({
  ClockIcon: () => React.createElement('svg', { 'data-testid': 'clock-icon' }),
  GearIcon: () => React.createElement('svg', { 'data-testid': 'gear-icon' }),
  ReportIcon: () => React.createElement('svg', { 'data-testid': 'report-icon' }),
  ListIcon: () => React.createElement('svg', { 'data-testid': 'list-icon' }),
  InfoIcon: () => React.createElement('svg', { 'data-testid': 'info-icon' }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('renders sidebar with navigation links', () => {
    render(<Sidebar><div>Test Content</div></Sidebar>);

    expect(screen.getByText('Punch In')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Timer')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('renders icons', () => {
    render(<Sidebar><div>Test</div></Sidebar>);

    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('report-icon')).toBeInTheDocument();
    expect(screen.getByTestId('list-icon')).toBeInTheDocument();
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

  test('About link routes to home and is first in navigation', () => {
    mockUsePathname.mockReturnValue('/');
    
    render(<Sidebar><div>Test</div></Sidebar>);
    
    const aboutLink = screen.getByText('About').closest('a');
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink?.getAttribute('href')).toBe('/');
    
    // Verify About is the first nav item by checking order
    const navLinks = screen.getAllByRole('link').filter(link => 
      link.textContent === 'About' || 
      link.textContent === 'Timer' || 
      link.textContent === 'Reports'
    );
    expect(navLinks[0].textContent).toBe('About');
  });

  test('normalizes /index.html to / for About link', () => {
    mockUsePathname.mockReturnValue('/index.html');
    
    render(<Sidebar><div>Test</div></Sidebar>);
    
    const aboutLink = screen.getByText('About').closest('a');
    expect(aboutLink?.getAttribute('class')).toContain('active');
  });

  test('handleLinkClick updates active state immediately', () => {
    mockUsePathname.mockReturnValue('/');
    
    render(<Sidebar><div>Test</div></Sidebar>);
    
    const timerLink = screen.getByText('Timer').closest('a');
    expect(timerLink?.getAttribute('class')).not.toContain('active');
    
    // Simulate click
    fireEvent.click(timerLink!);
    
    // Should be active immediately
    expect(timerLink?.getAttribute('class')).toContain('active');
    expect(screen.getByText('About').closest('a')?.getAttribute('class')).not.toContain('active');
  });

  test('only one navigation link is active at a time', () => {
    mockUsePathname.mockReturnValue('/timer');
    
    render(<Sidebar><div>Test</div></Sidebar>);
    
    const timerLink = screen.getByText('Timer').closest('a');
    const aboutLink = screen.getByText('About').closest('a');
    const reportsLink = screen.getByText('Reports').closest('a');
    
    expect(timerLink?.getAttribute('class')).toContain('active');
    expect(aboutLink?.getAttribute('class')).not.toContain('active');
    expect(reportsLink?.getAttribute('class')).not.toContain('active');
  });

  test('sets aria-current on active link', () => {
    mockUsePathname.mockReturnValue('/reports');
    
    render(<Sidebar><div>Test</div></Sidebar>);
    
    const reportsLink = screen.getByText('Reports').closest('a');
    expect(reportsLink?.getAttribute('aria-current')).toBe('page');
    
    const timerLink = screen.getByText('Timer').closest('a');
    expect(timerLink?.getAttribute('aria-current')).toBeNull();
  });
});

