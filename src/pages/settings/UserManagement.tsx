import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Edit2, Trash2, ShieldCheck, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { userService } from '../../services/userService';
import type { SupabaseUserProfile } from '../../services/userService';
import type { UserRole } from '../../types';
import { Button } from '../../components/UI/Button';
import { Input, Select } from '../../components/UI/Input';
import { Modal, ConfirmModal } from '../../components/UI/Modal';
import { Badge } from '../../components/UI/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useMediaQuery';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

interface EditForm { username: string; fullName: string; role: UserRole; }
interface CreateForm { username: string; password: string; fullName: string; role: UserRole; }

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const emptyCreate = (): CreateForm => ({ username: '', password: '', fullName: '', role: 'admin' });

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { isMobile } = useResponsive();
  const [users, setUsers] = useState<SupabaseUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ username: '', fullName: '', role: 'admin' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Create
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreatePw, setShowCreatePw] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    userService.getAll()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (u: SupabaseUserProfile) => {
    setEditingId(u.id);
    setEditForm({ username: u.username ?? '', fullName: u.fullName, role: u.role });
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setEditError(null);
    if (!editForm.username.trim()) { setEditError('Username is required'); return; }
    if (!editForm.fullName.trim()) { setEditError('Full name is required'); return; }

    setSaving(true);
    try {
      await userService.updateUser(editingId, {
        username: editForm.username.trim(),
        fullName: editForm.fullName.trim(),
        role: editForm.role,
      });
      setEditModalOpen(false);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setCreateError(null);
    if (!createForm.username.trim()) { setCreateError('Username is required'); return; }
    if (!createForm.password) { setCreateError('Password is required'); return; }
    if (!createForm.fullName.trim()) { setCreateError('Full name is required'); return; }

    setCreating(true);
    try {
      // Edge function slug is 'clever-worker' (Supabase-assigned), not 'create-user' — it's the deployed create-user function.
      const { data, error } = await supabase.functions.invoke('clever-worker', {
        body: {
          username: createForm.username.trim(),
          password: createForm.password,
          fullName: createForm.fullName.trim(),
          role: createForm.role,
        },
      });

      if (error) {
        let message = error.message;
        try {
          const body = await (error as { context: Response }).context.json();
          if (body?.error) message = body.error;
        } catch { /* ignore — fall back to error.message */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      setCreateModalOpen(false);
      setCreateForm(emptyCreate());
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await userService.deleteProfile(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
    setDeleteId(null);
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)', background: 'var(--bg)',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
  };

  if (loading) return <LoadingSpinner message="Loading users..." fullPage={false} />;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>User Management</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setCreateForm(emptyCreate()); setCreateError(null); setCreateModalOpen(true); }}>
          <UserPlus size={14} /> Add User
        </Button>
      </div>

      {error && (
        <div style={{ background: '#FDEDEC', border: '1px solid #F5C6CB', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
          <thead>
            <tr>
              <th style={thStyle}>Full Name</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Role</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No users yet. Click "Add User" to create one.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {u.fullName}
                    {u.id === currentUser?.id && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>(you)</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {(u as SupabaseUserProfile & { username?: string }).username ?? '—'}
                  </td>
                  <td style={tdStyle}>
                    <Badge variant={u.role === 'super_admin' ? 'locked' : 'primary'}>
                      {u.role === 'super_admin'
                        ? <><ShieldCheck size={10} style={{ marginRight: '3px' }} />Super Admin</>
                        : <><Shield size={10} style={{ marginRight: '3px' }} />Admin</>}
                    </Badge>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(u)}>
                        <Edit2 size={13} /> Edit
                      </Button>
                      {u.id !== currentUser?.id && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteId(u.id)}>
                          <Trash2 size={13} /> Remove
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New User"
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}><UserPlus size={14} /> Create User</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Username *"
            value={createForm.username}
            onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
            placeholder="e.g. john"
          />

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCreatePw ? 'text' : 'password'}
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Set a password"
                style={{ width: '100%', padding: '8px 40px 8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowCreatePw(!showCreatePw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {showCreatePw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <Input
            label="Full Name *"
            value={createForm.fullName}
            onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
            placeholder="e.g. John Smith"
          />

          <Select
            label="Role *"
            value={createForm.role}
            onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as UserRole }))}
            options={roleOptions}
          />

          {createError && (
            <div style={{ background: '#FDEDEC', border: '1px solid #F5C6CB', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
              {createError}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User Profile"
        width={400}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Username *"
            value={editForm.username}
            onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
            placeholder="e.g. john"
            hint="Changing this also changes the user's login."
          />
          <Input label="Full Name *" value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="e.g. John Smith" />
          <Select label="Role *" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))} options={roleOptions} />
          {editError && (
            <div style={{ background: '#FDEDEC', border: '1px solid #F5C6CB', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
              {editError}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
        title="Remove User"
        message="This removes the user's profile and access. Their account can be fully deleted from Supabase Dashboard if needed."
        confirmLabel="Remove"
      />
    </div>
  );
}
