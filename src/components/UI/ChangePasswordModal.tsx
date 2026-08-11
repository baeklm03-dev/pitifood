import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from './Modal';
import { Button } from './Button';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyForm = { current: '', next: '', confirm: '' };

function PasswordField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={label === 'Current Password' ? 'current-password' : 'new-password'}
          style={{ width: '100%', padding: '8px 40px 8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text)' }}
        />
        <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const close = () => {
    onClose();
    setTimeout(() => { setForm(emptyForm); setError(null); setDone(false); }, 150);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.current) { setError('Enter your current password'); return; }
    if (form.next.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.next !== form.confirm) { setError('New password and confirmation do not match'); return; }

    setSaving(true);
    try {
      const err = await changePassword(form.current, form.next);
      if (err) { setError(err); return; }
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change Password"
      width={400}
      footer={
        done ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}><KeyRound size={14} /> Change Password</Button>
          </>
        )
      }
    >
      {done ? (
        <p style={{ fontSize: '13px', color: 'var(--success)' }}>Password changed successfully.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <PasswordField label="Current Password" value={form.current} onChange={(v) => setForm((p) => ({ ...p, current: v }))} placeholder="Enter current password" />
          <PasswordField label="New Password" value={form.next} onChange={(v) => setForm((p) => ({ ...p, next: v }))} placeholder="At least 6 characters" />
          <PasswordField label="Confirm New Password" value={form.confirm} onChange={(v) => setForm((p) => ({ ...p, confirm: v }))} placeholder="Re-enter new password" />
          {error && (
            <div style={{ background: '#FDEDEC', border: '1px solid #F5C6CB', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
