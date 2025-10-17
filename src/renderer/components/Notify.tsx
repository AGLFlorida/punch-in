import { useState } from 'react';

type NotifyOptions = { 
  title: string; 
  body?: string 
}

type NotifyProps = {
  opts: NotifyOptions,
  close: () => void
}

export const NotifyBox = (props: NotifyProps) => { 
  const [notif, ] = useState<{ title: string; body?: string } | null>(props.opts);
  
  return (
  <div style={{
    position: 'fixed',
    top: 32,
    left: 0,
    right: 0,
    margin: '0 auto',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
  }}>
    <div style={{
      background: '#111827',
      color: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '16px 32px',
      minWidth: 240,
      textAlign: 'center',
      fontWeight: 600,
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{notif?.title}</div>
      {notif?.body && <div style={{ fontSize: 14 }}>{notif.body}</div>}
      <button style={{ marginTop: 12 }} onClick={() => props.close()}>OK</button>
    </div>
  </div>
)};
