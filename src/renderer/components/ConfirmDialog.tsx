import { useEffect } from 'react';

type ConfirmDialogProps = {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonStyle?: React.CSSProperties;
}

export const ConfirmDialog = (props: ConfirmDialogProps) => {
  const { 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    isOpen,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    confirmButtonStyle
  } = props;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '24px 32px',
        minWidth: 320,
        maxWidth: 480,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
          {title}
        </div>
        <div style={{ fontSize: 14, marginBottom: 24, color: '#6b7280' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              ...confirmButtonStyle,
            }}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

