import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(username.trim(), password);
    setLoading(false);
    if (ok) {
      navigate('/');
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const fieldStyle = (name: string): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px 11px 42px',
    border: `1.5px solid ${focused === name ? 'var(--primary)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    fontSize: '14px',
    outline: 'none',
    background: 'var(--surface)',
    color: 'var(--text)',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
  });

  const iconColor = (name: string) => focused === name ? 'var(--primary)' : 'var(--text-muted)';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #1a5276 0%, #2e86c1 60%, #5dade2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Card */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px 40px 36px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: 'var(--shadow-lg)',
        animation: 'modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/logo.png"
            alt="PITI FOODS"
            style={{ height: '100px', objectFit: 'contain', display: 'block', margin: '0 auto 14px' }}
          />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Sale Contract System
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Username field */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={15}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: iconColor('username'), transition: 'color 0.15s', pointerEvents: 'none' }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused(null)}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
                required
                style={fieldStyle('username')}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: iconColor('password'), transition: 'color 0.15s', pointerEvents: 'none' }}
              />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                style={{ ...fieldStyle('password'), paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#FDEDEC', border: '1px solid #F1948A', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '13px', color: '#C0392B' }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              padding: '13px',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.75 : 1,
              transition: 'filter 0.15s, opacity 0.15s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Signing in...</>
            ) : (
              <><LogIn size={15} /> Sign In</>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '28px' }}>
          PITI FOODS Co., Ltd. — Internal System
        </p>
      </div>
    </div>
  );
}
