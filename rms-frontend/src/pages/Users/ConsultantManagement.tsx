import { useState, useEffect } from 'react';
import { usersApi } from '../../services/api';
import Modal from '../../components/Modal';

interface ConsultantUser {
    id: number;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export default function ConsultantManagement() {
    const [users, setUsers] = useState<ConsultantUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Create modal
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '' });
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editUser, setEditUser] = useState<ConsultantUser | null>(null);
    const [editForm, setEditForm] = useState({ fullName: '', email: '', password: '', isActive: true });
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteUser, setDeleteUser] = useState<ConsultantUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try {
            const { data } = await usersApi.getAll();
            setUsers(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ── Create ──
    const handleCreate = async () => {
        setCreateError('');
        if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
            setCreateError('All fields are required.');
            return;
        }
        if (createForm.password.length < 6) {
            setCreateError('Password must be at least 6 characters.');
            return;
        }
        setCreating(true);
        try {
            await usersApi.create(createForm);
            setCreateOpen(false);
            setCreateForm({ fullName: '', email: '', password: '' });
            loadUsers();
        } catch (err: any) {
            setCreateError(err.response?.data?.message || 'Failed to create account.');
        } finally { setCreating(false); }
    };

    // ── Edit ──
    const openEdit = (u: ConsultantUser) => {
        setEditUser(u);
        setEditForm({ fullName: u.fullName, email: u.email, password: '', isActive: u.isActive });
        setEditError('');
        setEditOpen(true);
    };

    const handleEdit = async () => {
        if (!editUser) return;
        setEditError('');
        if (!editForm.fullName.trim() || !editForm.email.trim()) {
            setEditError('Full name and email are required.');
            return;
        }
        if (editForm.password && editForm.password.length < 6) {
            setEditError('Password must be at least 6 characters.');
            return;
        }
        setSaving(true);
        try {
            const payload: any = { fullName: editForm.fullName, email: editForm.email, isActive: editForm.isActive };
            if (editForm.password) payload.password = editForm.password;
            await usersApi.update(editUser.id, payload);
            setEditOpen(false);
            loadUsers();
        } catch (err: any) {
            setEditError(err.response?.data?.message || 'Failed to update account.');
        } finally { setSaving(false); }
    };

    // ── Delete ──
    const confirmDelete = (u: ConsultantUser) => {
        setDeleteUser(u);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        setDeleting(true);
        try {
            await usersApi.delete(deleteUser.id);
            setDeleteOpen(false);
            setDeleteUser(null);
            loadUsers();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete account.');
        } finally { setDeleting(false); }
    };

    const filtered = users.filter(u =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <h2>Manage Accounts</h2>
                </div>
                <div className="card">
                    <div style={{ padding: 24 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ marginBottom: 12 }}>
                                <div className="skeleton" style={{ height: 48, width: '100%' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h2>Manage Accounts</h2>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => { setCreateForm({ fullName: '', email: '', password: '' }); setCreateError(''); setCreateOpen(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        New Account
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="search-bar">
                <div className="search-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="search-input"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {filtered.length} account{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Table */}
            <div className="card">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="activity-avatar" style={{ width: 34, height: 34, fontSize: '0.78rem' }}>
                                                {u.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                                        </div>
                                    </td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span className={`badge ${u.isActive ? 'badge-open' : 'badge-rejected'}`}>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                                Edit
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(u)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                        {searchQuery ? 'No accounts matching your search.' : 'No accounts yet. Create one to get started.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Create Modal ── */}
            <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Account" width={480}>
                <div>
                    {createError && <div className="login-error" style={{ marginBottom: 16 }}>{createError}</div>}
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input className="form-input" placeholder="e.g. John Doe" value={createForm.fullName}
                            onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Email *</label>
                        <input className="form-input" type="email" placeholder="e.g. john@company.com" value={createForm.email}
                            onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Password *</label>
                        <input className="form-input" type="password" placeholder="Min 6 characters" value={createForm.password}
                            onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button className="btn btn-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                            {creating ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Edit Modal ── */}
            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Account" width={480}>
                <div>
                    {editError && <div className="login-error" style={{ marginBottom: 16 }}>{editError}</div>}
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input className="form-input" value={editForm.fullName}
                            onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Email *</label>
                        <input className="form-input" type="email" value={editForm.email}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>New Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                        <input className="form-input" type="password" placeholder="Enter new password" value={editForm.password}
                            onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={editForm.isActive}
                                onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                            />
                            <span>Account is Active</span>
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            Inactive accounts cannot log in.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button className="btn btn-secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Delete Confirm Modal ── */}
            <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Account" width={420}>
                <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>
                        Are you sure you want to delete <strong>{deleteUser?.fullName}</strong>'s account?
                    </p>
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 20 }}>
                        This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
