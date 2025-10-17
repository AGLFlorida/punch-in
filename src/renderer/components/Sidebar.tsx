'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, type PropsWithChildren } from 'react';
import { ClockIcon, GearIcon, ReportIcon } from './CustomImage';

type SidebarProps = PropsWithChildren<object>;

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);

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
            <Link href="/timer" className={`navBtn ${pathname.startsWith('/timer') ? 'active' : ''}`}>
              {collapsed ? (
                <ClockIcon />
              ) : (
                <span>Timer</span>
              )}
            </Link>
            <Link href="/reports" className={`navBtn ${pathname.startsWith('/reports') ? 'active' : ''}`}>
              {collapsed ? (
                <ReportIcon />
              ) : (
                <span>Reports</span>
              )}
            </Link>
            <Link href="/configure" className={`navBtn ${pathname.startsWith('/configure') ? 'active' : ''}`}>
              {collapsed ? (
                <GearIcon />
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
