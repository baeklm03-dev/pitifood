import React from 'react';

interface Props {
  message?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ message = 'Loading...', fullPage = true }: Props) {
  const wrapper: React.CSSProperties = fullPage
    ? {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: 'var(--bg)',
      }
    : {
        padding: '60px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
      };

  return (
    <div style={wrapper}>
      <div className="spinner" />
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}
