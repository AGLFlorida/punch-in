'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, type PropsWithChildren } from 'react';
import { ClockIcon, GearIcon, ReportIcon, ListIcon, InfoIcon } from './CustomImage';
import { useNavigationGuard } from './NavigationGuard';

type SidebarProps = PropsWithChildren<object>;

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { checkGuard } = useNavigationGuard();
  
  // Normalize pathname: /index.html should be treated as /
  const normalizePath = (path: string | null | undefined): string => {
    if (!path || typeof path !== 'string') return '/';
    // In Electron with Next.js, the root route may be /index.html
    if (path === '/index.html' || path === '/') return '/';
    return path;
  };
  
  const normalizedPathname = normalizePath(pathname);
  const [currentPath, setCurrentPath] = useState<string>(normalizedPathname);
  const hasManualClick = useRef<boolean>(false);
  
  // Update currentPath when pathname changes from usePathname hook
  // But don't overwrite if user has manually clicked a link (usePathname may be stale in Electron)
  useEffect(() => {
    if (hasManualClick.current) {
      // User has manually clicked, don't overwrite with potentially stale pathname
      // Reset the flag after a short delay to allow pathname to catch up
      const timer = setTimeout(() => {
        hasManualClick.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
    const normalized = normalizePath(pathname);
    setCurrentPath(prev => {
      // Only update if pathname actually changed and is different from current
      if (normalized !== prev) {
        return normalized;
      }
      return prev;
    });
  }, [pathname]);
  
  // Handler to manually update currentPath when a link is clicked
  // This ensures the active state updates immediately on click
  const handleLinkClick = async (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    // Always prevent default first to stop Next.js Link navigation
    e.preventDefault();
    e.stopPropagation();
    
    // Check navigation guard before proceeding
    const canNavigate = await checkGuard(href);
    if (!canNavigate) {
      // Guard blocked navigation, don't proceed
      return;
    }
    
    // Navigation allowed, proceed with manual navigation
    hasManualClick.current = true;
    setCurrentPath(href);
    
    // Use Next.js router to navigate programmatically
    try {
      router.push(href);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Reset state on navigation failure
      hasManualClick.current = false;
    }
  };
  
  // Determine active states - ensure only one is active at a time
  // This prevents multiple links from being active simultaneously
  const isAboutActive = currentPath === '/';
  const isTimerActive = !isAboutActive && currentPath.startsWith('/timer');
  const isReportsActive = !isAboutActive && !isTimerActive && currentPath.startsWith('/reports');
  const isSessionsActive = !isAboutActive && !isTimerActive && !isReportsActive && currentPath.startsWith('/sessions');
  const isConfigureActive = !isAboutActive && !isTimerActive && !isReportsActive && !isSessionsActive && currentPath.startsWith('/configure');
  

  // Load collapsed state from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('sidebarCollapsed');
      if (stored !== null) setCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sidebarCollapsed', collapsed ? 'true' : 'false');
    }
  }, [collapsed]);

  return (
    <div className={collapsed ? 'collapsed' : ''}>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebarHeader">
            <div className="logoAndTitle">
              <Image 
                src="/logo.png" 
                alt="Punch In Logo" 
                width={24} 
                height={24}
                className="logo"
                onClick={() => setCollapsed(!collapsed)}
              />
              <span className="hideWhenCollapsed">Punch In</span>
            </div>
            {!collapsed ? <button className="toggle" onClick={() => setCollapsed(!collapsed)}>{'<'}</button>:''}
          </div>
          <nav className="nav">
            <Link 
              href="/" 
              className={`navBtn ${isAboutActive ? 'active' : ''}`}
              onClick={(e) => handleLinkClick('/', e)}
              aria-current={isAboutActive ? 'page' : undefined}
            >
              <InfoIcon />
              {collapsed ? (
                ''
              ) : (
                <span>About</span>
              )}
            </Link>
            <Link 
              href="/timer" 
              className={`navBtn ${isTimerActive ? 'active' : ''}`}
              onClick={(e) => handleLinkClick('/timer', e)}
              aria-current={isTimerActive ? 'page' : undefined}
            >
              <ClockIcon />
              {collapsed ? (
                ''
              ) : (
                <span>Timer</span>
              )}
            </Link>
            <Link 
              href="/reports" 
              className={`navBtn ${isReportsActive ? 'active' : ''}`}
              onClick={(e) => handleLinkClick('/reports', e)}
              aria-current={isReportsActive ? 'page' : undefined}
            >
              <ReportIcon />
              {collapsed ? (
                ''
              ) : (
                <span>Reports</span>
              )}
            </Link>
            <Link 
              href="/sessions" 
              className={`navBtn ${isSessionsActive ? 'active' : ''}`}
              onClick={(e) => handleLinkClick('/sessions', e)}
              aria-current={isSessionsActive ? 'page' : undefined}
            >
              <ListIcon />
              {collapsed ? (
                ''
              ) : (
                <span>Sessions</span>
              )}
            </Link>
            <Link 
              href="/configure" 
              className={`navBtn ${isConfigureActive ? 'active' : ''}`}
              onClick={(e) => handleLinkClick('/configure', e)}
              aria-current={isConfigureActive ? 'page' : undefined}
            >
              <GearIcon />
              {collapsed ? (
                ''
              ) : (
                <span>Configure</span>
              )}
            </Link>
          </nav>
        </aside>

        <section className="main">
          {children}
        </section>
      </div>
    </div>
  );
}
