'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, type PropsWithChildren } from 'react';

type SidebarProps = PropsWithChildren<object>;

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={collapsed ? 'collapsed' : ''}>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebarHeader">
            <span className="hideWhenCollapsed">Time Punch</span>
            <button className="toggle" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? '>' : '<'}
            </button>
          </div>
          <nav className="nav">
            <Link href="/timer" className={`navBtn ${pathname.startsWith('/timer') ? 'active' : ''}`}>
              <span className="hideWhenCollapsed">Timer</span>
            </Link>
            <Link href="/reports" className={`navBtn ${pathname.startsWith('/reports') ? 'active' : ''}`}>
              <span className="hideWhenCollapsed">Reports</span>
            </Link>
            <Link href="/configure" className={`navBtn ${pathname.startsWith('/configure') ? 'active' : ''}`}>
              <span className="hideWhenCollapsed">Configure</span>
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
