'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserAction,
  resetPasswordAction,
  toggleUserStatusAction,
} from '@/lib/actions/auth.actions';
import { adminUpdateUserFullAction } from '@/lib/actions/admin.actions';
import {
  UserPlus,
  Search,
  Edit2,
  Ban,
  CheckCircle,
  KeyRound,
  X,
  ChevronDown,
  User,
  BookOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';

function formatDate(isoStr: string): string {
  const raw = isoStr?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}


type UserRow = {
  id: string;
  username: string;
  name: string;
  phone?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
};

type Props = { users: UserRow[] };

export default function UsersClient({ users }: Props) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [resetModal, setResetModal] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  // Edit Modal States
  const [editModalUser, setEditModalUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editingUser, setEditingUser] = useState(false);

  function openEditModal(user: UserRow) {
    setEditModalUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPhone(user.phone || '');
    setEditIsActive(user.is_active);
    setEditPassword('');
    setMessage(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModalUser) return;
    setEditingUser(true);
    setMessage(null);

    const result = await adminUpdateUserFullAction(editModalUser.id, {
      name: editName,
      username: editUsername,
      phone: editPhone || undefined,
      password: editPassword || undefined,
      is_active: editIsActive,
    });

    setEditingUser(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `User @${editUsername} updated successfully` });
      setEditModalUser(null);
      startTransition(() => router.refresh());
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search))
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await createUserAction(formData);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `User @${result.user?.username} created successfully` });
      setShowCreate(false);
      startTransition(() => router.refresh());
    }
  }

  async function handleToggle(userId: string, currentStatus: boolean) {
    const result = await toggleUserStatusAction(userId, !currentStatus);
    if (!result.error) {
      setMessage({
        type: 'success',
        text: `User ${currentStatus ? 'disabled' : 'enabled'} successfully`,
      });
      startTransition(() => router.refresh());
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetModal) return;
    const result = await resetPasswordAction(resetModal.id, newPassword);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Password reset successfully' });
      setResetModal(null);
      setNewPassword('');
    }
  }

  return (
    <>
      <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Users
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
              {users.length} total users
            </p>
          </div>
          <button onClick={() => { setShowCreate(true); setMessage(null); }} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <UserPlus size={16} /> Create User
          </button>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: message.type === 'success' ? 'var(--success-muted)' : 'var(--danger-muted)',
                border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {message.text}
              <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or username..."
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {/* Table / Card List */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['User', 'Username', 'Phone Number', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.75rem 1.25rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      @{user.username}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {user.phone || '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span className={`badge ${user.is_active ? 'badge-accepted' : 'badge-rejected'}`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(user.created_at)}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <Link
                          href={`/admin/users/${user.id}/ledgers`}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="View Ledgers"
                        >
                          <BookOpen size={14} />
                        </Link>
                        <button
                          onClick={() => openEditModal(user)}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit user"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => { setResetModal(user); setNewPassword(''); }}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Reset password"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(user.id, user.is_active)}
                          className={`btn btn-${user.is_active ? 'danger' : 'success'} btn-sm`}
                          title={user.is_active ? 'Disable user' : 'Enable user'}
                          style={{ gap: '0.25rem' }}
                        >
                          {user.is_active ? <Ban size={13} /> : <CheckCircle size={13} />}
                          {user.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="mobile-list-view" style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((user, i) => (
              <div
                key={user.id}
                style={{
                  padding: '1.25rem',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${user.is_active ? 'badge-accepted' : 'badge-rejected'}`} style={{ flexShrink: 0 }}>
                    {user.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Joined {formatDate(user.created_at)}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link
                      href={`/admin/users/${user.id}/ledgers`}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '36px', padding: '0 0.75rem', gap: '0.375rem', fontSize: '0.8125rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                      title="View Ledgers"
                    >
                      <BookOpen size={13} /> Ledgers
                    </Link>
                    <button
                      onClick={() => openEditModal(user)}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '36px', padding: '0 0.75rem', gap: '0.375rem', fontSize: '0.8125rem' }}
                      title="Edit user"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => { setResetModal(user); setNewPassword(''); }}
                      className="btn btn-secondary btn-sm"
                      style={{ height: '36px', padding: '0 0.75rem', gap: '0.375rem', fontSize: '0.8125rem' }}
                      title="Reset password"
                    >
                      <KeyRound size={13} /> Pass
                    </button>
                    <button
                      onClick={() => handleToggle(user.id, user.is_active)}
                      className={`btn btn-${user.is_active ? 'danger' : 'success'} btn-sm`}
                      style={{ height: '36px', padding: '0 0.75rem', gap: '0.375rem', fontSize: '0.8125rem' }}
                    >
                      {user.is_active ? <Ban size={13} /> : <CheckCircle size={13} />}
                      {user.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No users found
              </div>
            )}
          </div>
        </div>

        <style>{`
          .desktop-table-view { display: none; }
          .mobile-list-view { display: flex; }
          @media (min-width: 769px) {
            .desktop-table-view { display: block; }
            .mobile-list-view { display: none !important; }
          }
        `}</style>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreate && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overlay-backdrop"
              style={{ position: 'absolute', inset: 0, zIndex: -1 }}
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: '100%',
                maxWidth: 600,
                maxHeight: '90dvh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-xl)',
                padding: '1.5rem',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexShrink: 0 }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create User</h2>
                <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-icon"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px', marginBottom: '1.25rem' }}>
                  {[
                    { name: 'name', label: 'Full Name', placeholder: 'e.g. Rahul Sharma', required: true },
                    { name: 'username', label: 'Username', placeholder: 'e.g. rahul_sharma', required: true },
                    { name: 'password', label: 'Password', placeholder: 'Min 6 characters', required: true, type: 'password' },
                    { name: 'phone', label: 'Phone (optional)', placeholder: '+91 XXXXX XXXXX', required: false },
                  ].map((f) => (
                    <div key={f.name}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>{f.label}</label>
                      <input name={f.name} type={f.type ?? 'text'} placeholder={f.placeholder} required={f.required} className="input" />
                    </div>
                  ))}
                  {message && message.type === 'error' && (
                    <div
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: 'var(--danger-muted)',
                        border: '1px solid var(--danger-border)',
                        color: 'var(--danger)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      {message.text}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', flexShrink: 0 }}>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost" style={{ minWidth: '100px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ minWidth: '120px', justifyContent: 'center' }}>
                    Create User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editModalUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overlay-backdrop" onClick={() => setEditModalUser(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '92vw', maxWidth: 440, maxHeight: '90dvh', overflowY: 'auto', background: 'var(--bg-surface)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)', zIndex: 60, padding: '2rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Edit User</h2>
                <button onClick={() => setEditModalUser(null)} className="btn btn-ghost btn-icon"><X size={18} /></button>
              </div>
              <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="input"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    className="input"
                    placeholder="e.g. rahul_sharma"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Phone Number (optional)</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="input"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="input"
                    minLength={6}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Status</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="editIsActive"
                        checked={editIsActive === true}
                        onChange={() => setEditIsActive(true)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="editIsActive"
                        checked={editIsActive === false}
                        onChange={() => setEditIsActive(false)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      Inactive
                    </label>
                  </div>
                </div>

                {message && message.type === 'error' && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'var(--danger-muted)',
                      border: '1px solid var(--danger-border)',
                      color: 'var(--danger)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {message.text}
                  </div>
                )}

                <button type="submit" disabled={editingUser} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
                  {editingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overlay-backdrop" onClick={() => setResetModal(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '92vw', maxWidth: 400, maxHeight: '90dvh', overflowY: 'auto', background: 'var(--bg-surface)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)', zIndex: 60, padding: '2rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reset Password</h2>
                <button onClick={() => setResetModal(null)} className="btn btn-ghost btn-icon"><X size={18} /></button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Setting new password for <strong style={{ color: 'var(--text-primary)' }}>@{resetModal.username}</strong>. All active sessions will be invalidated.
              </p>
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="input"
                    minLength={6}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                  Reset Password
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
