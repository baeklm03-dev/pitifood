import React from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, FileText, Users, Tag, LayoutDashboard, ArrowRight, ClipboardList } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useResponsive } from '../hooks/useMediaQuery';

interface QuickAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  bg: string;
}

const PRIMARY_ACTION: QuickAction = {
  label: 'New Contract',
  description: 'สร้าง sale contract ใหม่',
  icon: <FilePlus2 size={30} />,
  to: '/contracts/new',
  bg: 'var(--primary)',
};

const ACTIONS: QuickAction[] = [
  { label: 'Contracts', description: 'ดู / จัดการสัญญาทั้งหมด', icon: <FileText size={26} />, to: '/contracts', bg: 'var(--primary-light)' },
  { label: 'Production Orders', description: 'สร้าง / จัดการใบสั่งผลิตจาก contract ที่ sign แล้ว', icon: <ClipboardList size={26} />, to: '/po', bg: 'var(--warning)' },
  { label: 'Buyers', description: 'ข้อมูลลูกค้าและบริษัทย่อย', icon: <Users size={26} />, to: '/buyers', bg: 'var(--accent)' },
  { label: 'Brands', description: 'แบรนด์ ประเภทสินค้า และขนาด packing', icon: <Tag size={26} />, to: '/brands', bg: 'var(--success)' },
  { label: 'Dashboard / Reports', description: 'สถิติ สรุป และ export รายงาน', icon: <LayoutDashboard size={26} />, to: '/dashboard', bg: 'var(--locked)' },
];

export function Home() {
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const cardHover = (e: React.MouseEvent<HTMLElement>, on: boolean) => {
    e.currentTarget.style.filter = on ? 'brightness(1.08)' : 'none';
    e.currentTarget.style.transform = on ? 'translateY(-2px)' : 'none';
    e.currentTarget.style.boxShadow = on ? 'var(--shadow-md)' : 'var(--shadow-sm)';
  };

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '40px 32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
          {greeting}, {user?.fullName} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Primary action — full width */}
      <Link
        to={PRIMARY_ACTION.to}
        style={{ background: PRIMARY_ACTION.bg, borderRadius: 'var(--radius-lg)', padding: '28px 32px', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', position: 'relative', overflow: 'hidden', transition: 'filter 0.15s, transform 0.15s, box-shadow 0.15s', boxShadow: 'var(--shadow-sm)' }}
        onMouseEnter={(e) => cardHover(e, true)}
        onMouseLeave={(e) => cardHover(e, false)}
      >
        <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '14px', padding: '16px', display: 'flex' }}>{PRIMARY_ACTION.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{PRIMARY_ACTION.label}</div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>{PRIMARY_ACTION.description}</div>
        </div>
        <ArrowRight size={24} style={{ opacity: 0.85 }} />
      </Link>

      {/* Secondary quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            style={{ background: a.bg, borderRadius: 'var(--radius-lg)', padding: '22px', color: '#fff', textDecoration: 'none', display: 'block', position: 'relative', overflow: 'hidden', transition: 'filter 0.15s, transform 0.15s, box-shadow 0.15s', boxShadow: 'var(--shadow-sm)', minHeight: '120px' }}
            onMouseEnter={(e) => cardHover(e, true)}
            onMouseLeave={(e) => cardHover(e, false)}
          >
            <div style={{ position: 'absolute', right: '12px', bottom: '8px', opacity: 0.18, transform: 'scale(1.9)', transformOrigin: 'right bottom' }}>{a.icon}</div>
            <div style={{ marginBottom: '10px', display: 'flex' }}>{a.icon}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{a.label}</div>
            <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.4 }}>{a.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
