import React from 'react';

type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning' | 'locked' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const colors: Record<BadgeVariant, { bg: string; color: string }> = {
  primary: { bg: '#EBF5FB', color: 'var(--primary)' },
  success: { bg: '#EAFAF1', color: 'var(--success)' },
  danger: { bg: '#FDEDEC', color: 'var(--danger)' },
  warning: { bg: '#FEF9E7', color: 'var(--warning)' },
  locked: { bg: '#F5EEF8', color: 'var(--locked)' },
  neutral: { bg: 'var(--bg)', color: 'var(--text-muted)' },
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const { bg, color } = colors[variant];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      lineHeight: 1.4,
      background: bg,
      color,
    }}>
      {children}
    </span>
  );
}
