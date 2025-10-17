"use client";

import React, { useState, useEffect } from 'react';

export default function DevBadge() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Check after mount if the stub has activated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isActive = !!(window as any).__TP_STUB_ACTIVE;
    setActive(isActive);
  }, []);

  if (!active) return null;

  return (
    <div style={{ position: 'fixed', top: 12, right: 500, background: '#ffcc00', padding: '6px 10px', borderRadius: 6, zIndex: 9999, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
      Dev Stub Active
    </div>
  );
}
