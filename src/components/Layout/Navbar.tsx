import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, User, Settings, Menu, X, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useMediaQuery';
import { ChangePasswordModal } from '../UI/ChangePasswordModal';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const [masterOpen, setMasterOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const masterRef = useRef<HTMLDivElement>(null);
  const contractRef = useRef<HTMLDivElement>(null);
  const poRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!masterRef.current?.contains(e.target as Node)) setMasterOpen(false);
      if (!contractRef.current?.contains(e.target as Node)) setContractOpen(false);
      if (!poRef.current?.contains(e.target as Node)) setPoOpen(false);
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close the mobile menu when switching back to desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isHome = location.pathname === '/';

  const navLink: React.CSSProperties = {
    padding: '7px 13px',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'background 0.15s, color 0.15s',
    border: 'none',
    background: 'transparent',
    textDecoration: 'none',
  };

  const navLinkActive: React.CSSProperties = {
    ...navLink,
    background: '#EBF5FB',
    color: 'var(--primary)',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border)',
    minWidth: '190px',
    overflow: 'hidden',
    zIndex: 500,
    padding: '6px',
    animation: 'fadeIn 0.12s ease-out',
  };

  const dropdownItem: React.CSSProperties = {
    display: 'block',
    padding: '9px 12px',
    fontSize: '13px',
    color: 'var(--text)',
    cursor: 'pointer',
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    transition: 'background 0.12s',
  };

  const onItemHover = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'var(--bg)'; };
  const onItemLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'transparent'; };

  const mobileItem: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '13px 16px', fontSize: '15px', fontWeight: 500,
    color: 'var(--text)', textDecoration: 'none', background: 'transparent',
    border: 'none', width: '100%', textAlign: 'left', borderRadius: 'var(--radius)',
  };
  const mobileSectionLabel: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', padding: '14px 16px 4px',
  };
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav style={{
        background: 'var(--surface)',
        padding: isMobile ? '0 16px' : '0 24px',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
        position: 'sticky',
        top: 0,
        zIndex: 400,
      }}>
        {/* Logo */}
        <Link to="/" onClick={closeMobile} style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '-0.02em',
          marginRight: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none',
        }}>
          <img src="/logo.png" alt="PITI FOODS" style={{ height: '38px', objectFit: 'contain' }} />
        </Link>

        {!isMobile && (
          <>
            {/* Divider */}
            <div style={{ width: '1px', height: '22px', background: 'var(--border)', margin: '0 8px' }} />

            {/* Home */}
            <Link
              to="/"
              style={isHome ? navLinkActive : navLink}
              onMouseEnter={(e) => { if (!isHome) e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={(e) => { if (!isHome) e.currentTarget.style.background = 'transparent'; }}
            >
              Home
            </Link>

            {/* Dashboard */}
            <Link
              to="/dashboard"
              style={isActive('/dashboard') ? navLinkActive : navLink}
              onMouseEnter={(e) => { if (!isActive('/dashboard')) e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={(e) => { if (!isActive('/dashboard')) e.currentTarget.style.background = 'transparent'; }}
            >
              Dashboard
            </Link>

            {/* Contracts dropdown */}
            <div ref={contractRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setContractOpen(!contractOpen); setMasterOpen(false); setPoOpen(false); setUserOpen(false); }}
                style={isActive('/contracts') || contractOpen ? navLinkActive : navLink}
                onMouseEnter={(e) => { if (!isActive('/contracts') && !contractOpen) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={(e) => { if (!isActive('/contracts') && !contractOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                Contracts <ChevronDown size={13} />
              </button>
              {contractOpen && (
                <div style={dropdownStyle}>
                  <Link to="/contracts" style={dropdownItem} onMouseEnter={onItemHover} onMouseLeave={onItemLeave} onClick={() => setContractOpen(false)}>All Contracts</Link>
                  <Link to="/contracts/new" style={dropdownItem} onMouseEnter={onItemHover} onMouseLeave={onItemLeave} onClick={() => setContractOpen(false)}>New Contract</Link>
                </div>
              )}
            </div>

            {/* Production Orders dropdown */}
            <div ref={poRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setPoOpen(!poOpen); setMasterOpen(false); setContractOpen(false); setUserOpen(false); }}
                style={isActive('/po') || poOpen ? navLinkActive : navLink}
                onMouseEnter={(e) => { if (!isActive('/po') && !poOpen) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={(e) => { if (!isActive('/po') && !poOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                Production Orders <ChevronDown size={13} />
              </button>
              {poOpen && (
                <div style={dropdownStyle}>
                  <Link to="/po" style={dropdownItem} onMouseEnter={onItemHover} onMouseLeave={onItemLeave} onClick={() => setPoOpen(false)}>All Production Orders</Link>
                  <Link to="/po/new" style={dropdownItem} onMouseEnter={onItemHover} onMouseLeave={onItemLeave} onClick={() => setPoOpen(false)}>New Production Order</Link>
                </div>
              )}
            </div>

            {/* Master Data dropdown */}
            <div ref={masterRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setMasterOpen(!masterOpen); setContractOpen(false); setPoOpen(false); setUserOpen(false); }}
                style={(isActive('/buyers') || isActive('/brands') || masterOpen) ? navLinkActive : navLink}
                onMouseEnter={(e) => { if (!isActive('/buyers') && !isActive('/brands') && !masterOpen) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={(e) => { if (!isActive('/buyers') && !isActive('/brands') && !masterOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                Master Data <ChevronDown size={13} />
              </button>
              {masterOpen && (
                <div style={dropdownStyle}>
                  <Link to="/buyers" style={dropdownItem} onMouseEnter={onItemHover} onMouseLeave={onItemLeave} onClick={() => setMasterOpen(false)}>Buyers</Link>
                  <Link to="/brands" style={dropdownItem} onMouseEnter={onItemHover} onMouseLeave={onItemLeave} onClick={() => setMasterOpen(false)}>Brands</Link>
                </div>
              )}
            </div>

            {/* Settings (super_admin only) */}
            {user?.role === 'super_admin' && (
              <Link
                to="/settings/users"
                style={isActive('/settings') ? navLinkActive : navLink}
                onMouseEnter={(e) => { if (!isActive('/settings')) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={(e) => { if (!isActive('/settings')) e.currentTarget.style.background = 'transparent'; }}
              >
                <Settings size={14} />
                Settings
              </Link>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* User menu */}
            <div ref={userRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setUserOpen(!userOpen); setMasterOpen(false); setContractOpen(false); setPoOpen(false); }}
                style={userOpen ? navLinkActive : navLink}
                onMouseEnter={(e) => { if (!userOpen) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={(e) => { if (!userOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                <User size={14} />
                {user?.fullName}
                <ChevronDown size={13} />
              </button>
              {userOpen && (
                <div style={{ ...dropdownStyle, left: 'auto', right: 0 }}>
                  <div style={{ padding: '8px 12px 10px', marginBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Signed in as</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{user?.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
                      {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </div>
                  </div>
                  <button
                    onClick={() => { setUserOpen(false); setChangePwOpen(true); }}
                    onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                    style={{ ...dropdownItem, display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <KeyRound size={14} /> Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                    style={{ ...dropdownItem, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {isMobile && (
          <>
            <div style={{ flex: 1 }} />
            <button
              aria-label="Menu"
              onClick={() => setMobileOpen((o) => !o)}
              style={{ background: mobileOpen ? 'var(--bg)' : 'transparent', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--primary)', display: 'flex', padding: '8px' }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </>
        )}
      </nav>

      {/* Mobile slide-down menu */}
      {isMobile && mobileOpen && (
        <>
          <div onClick={closeMobile} style={{ position: 'fixed', inset: '58px 0 0 0', background: 'rgba(20,28,48,0.35)', zIndex: 380 }} />
          <div style={{
            position: 'sticky', top: '58px', zIndex: 390,
            background: 'var(--surface)', borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)', padding: '8px', maxHeight: 'calc(100vh - 58px)',
            overflowY: 'auto', animation: 'fadeIn 0.14s ease-out',
          }}>
            <Link to="/" onClick={closeMobile} style={mobileItem}>Home</Link>
            <Link to="/dashboard" onClick={closeMobile} style={mobileItem}>Dashboard</Link>

            <div style={mobileSectionLabel}>Contracts</div>
            <Link to="/contracts" onClick={closeMobile} style={mobileItem}>All Contracts</Link>
            <Link to="/contracts/new" onClick={closeMobile} style={mobileItem}>New Contract</Link>

            <div style={mobileSectionLabel}>Production Orders</div>
            <Link to="/po" onClick={closeMobile} style={mobileItem}>All Production Orders</Link>
            <Link to="/po/new" onClick={closeMobile} style={mobileItem}>New Production Order</Link>

            <div style={mobileSectionLabel}>Master Data</div>
            <Link to="/buyers" onClick={closeMobile} style={mobileItem}>Buyers</Link>
            <Link to="/brands" onClick={closeMobile} style={mobileItem}>Brands</Link>

            {user?.role === 'super_admin' && (
              <>
                <div style={mobileSectionLabel}>Settings</div>
                <Link to="/settings/users" onClick={closeMobile} style={mobileItem}><Settings size={16} /> User Management</Link>
              </>
            )}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px' }}>
              <div style={{ padding: '4px 16px 8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Signed in as</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{user?.fullName}</div>
                <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </div>
              </div>
              <button onClick={() => { closeMobile(); setChangePwOpen(true); }} style={mobileItem}>
                <KeyRound size={16} /> Change Password
              </button>
              <button onClick={() => { closeMobile(); handleLogout(); }} style={{ ...mobileItem, color: 'var(--danger)' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </>
      )}

      <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </>
  );
}
