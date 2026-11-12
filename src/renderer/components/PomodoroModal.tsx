'use client';

import { useEffect, useRef } from 'react';

interface PomodoroModalProps {
  /** Called when the user clicks OK to end the break and resume work. */
  onOk: () => void;
}

/**
 * Full-screen modal shown when the 50-minute pomodoro alert fires.
 * The overlay cannot be dismissed by clicking outside or pressing Escape —
 * the user must click OK to resume the work cycle.
 */
export function PomodoroModal({ onOk }: PomodoroModalProps) {
  const okBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the OK button on mount so keyboard users can press Enter
  useEffect(() => {
    okBtnRef.current?.focus();
  }, []);

  // Block Escape key from dismissing the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return (
    <div
      data-testid="pomodoro-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Pomodoro break"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
      }}
      // Intentionally no onClick on the backdrop — dismissal requires OK
    >
      <div
        data-testid="pomodoro-modal-dialog"
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '32px 40px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          minWidth: 240,
        }}
      >
        <p style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0' }}>☕</p>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700 }}>See you in 10</h2>
        <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: 14 }}>
          Take a 10-minute break. Click OK when you&apos;re back.
        </p>
        <button
          ref={okBtnRef}
          data-testid="pomodoro-ok-btn"
          onClick={onOk}
          style={{
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 32px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
