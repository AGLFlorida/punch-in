"use client";

import React from 'react';

export default function DevBadge() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = typeof window !== 'undefined' && !!(window as any).__TP_STUB_ACTIVE;
  if (!active) return null;

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, background: '#ffcc00', padding: '6px 10px', borderRadius: 6, zIndex: 9999, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
      Dev Stub Active
    </div>
  );
}
