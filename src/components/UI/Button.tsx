import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--primary)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 2px rgba(27,79,114,0.25)',
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--primary)',
    border: '1.5px solid var(--border-strong)',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 2px rgba(231,76,60,0.25)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1.5px solid transparent',
  },
  success: {
    background: 'var(--success)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 2px rgba(39,174,96,0.25)',
  },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '5px 11px', fontSize: '12px', borderRadius: 'var(--radius-sm)' },
  md: { padding: '8px 16px', fontSize: '13px', borderRadius: 'var(--radius)' },
  lg: { padding: '11px 22px', fontSize: '14px', borderRadius: 'var(--radius)' },
};

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, onMouseEnter, onMouseLeave, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.filter = 'brightness(1.07)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'none';
        e.currentTarget.style.transform = 'none';
        onMouseLeave?.(e);
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'transform 0.15s, box-shadow 0.15s, filter 0.15s, background 0.15s, border-color 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
        ...styles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {loading ? <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px' }} /> : children}
    </button>
  );
}
