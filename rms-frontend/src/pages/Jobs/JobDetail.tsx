import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsApi, BACKEND_URL } from '../../services/api';
import type { JobPosition } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';

export default function JobDetail() {
    const { id } = useParams();
    const [job, setJob] = useState<JobPosition | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [updating, setUpdating] = useState(false);
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '', department: '', location: '', managerName: '',
        numberOfPositions: 1, description: '', requirements: '',
        salaryRangeMin: '' as string | number, salaryRangeMax: '' as string | number,
    });
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadJob(); }, [id]);

    const loadJob = async () => {
        try {
            const { data } = await jobsApi.getById(Number(id));
            setJob(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const getStatusBadge = (status: string) => {
        const cls: Record<string, string> = { New: 'badge-new', InProgress: 'badge-progress', Recruited: 'badge-recruited', Rejected: 'badge-rejected', Open: 'badge-open', Closed: 'badge-closed', OnHold: 'badge-onhold' };
        const labels: Record<string, string> = { InProgress: 'In Progress', OnHold: 'On Hold' };
        return <span className={`badge ${cls[status] || ''}`}>{labels[status] || status}</span>;
    };

    const openStatusModal = () => {
        if (job) {
            setNewStatus(job.status);
            setStatusModalOpen(true);
        }
    };

    const handleStatusChange = async () => {
        if (!job || newStatus === job.status) {
            setStatusModalOpen(false);
            return;
        }
        setUpdating(true);
        try {
            await jobsApi.updateStatus(job.id, newStatus);
            setJob({ ...job, status: newStatus });
            setStatusModalOpen(false);
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update status. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    // ── Edit Job ──
    const openEditModal = () => {
        if (!job) return;
        setEditForm({
            title: job.title,
            department: job.department,
            location: job.location || '',
            managerName: job.managerName,
            numberOfPositions: job.numberOfPositions,
            description: job.description || '',
            requirements: job.requirements || '',
            salaryRangeMin: job.salaryRangeMin || '',
            salaryRangeMax: job.salaryRangeMax || '',
        });
        setEditError('');
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!job) return;
        setEditError('');
        if (!editForm.title.trim() || !editForm.department.trim() || !editForm.managerName.trim()) {
            setEditError('Title, department, and manager name are required.');
            return;
        }
        setSaving(true);
        try {
            await jobsApi.update(job.id, {
                ...editForm,
                interviewStepCount: job.interviewStepCount,
                salaryRangeMin: editForm.salaryRangeMin ? Number(editForm.salaryRangeMin) : null,
                salaryRangeMax: editForm.salaryRangeMax ? Number(editForm.salaryRangeMax) : null,
                interviewSteps: [],
            });
            setEditOpen(false);
            loadJob();
        } catch (err: any) {
            setEditError(err.response?.data?.message || 'Failed to save changes.');
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <div className="skeleton" style={{ height: 24, width: 160, marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 28, width: 300 }} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                    <div className="card">
                        <div style={{ padding: 24 }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ marginBottom: 16 }}>
                                    <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 6 }} />
                                    <div className="skeleton" style={{ height: 18, width: '50%' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ padding: 24 }}>
                            <div className="skeleton" style={{ height: 60, width: '100%', marginBottom: 12 }} />
                            <div className="skeleton" style={{ height: 60, width: '100%' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!job) return <div className="empty-state"><h3>Position not found</h3></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <code style={{ background: 'var(--accent-bg)', padding: '4px 10px', borderRadius: 6, fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>{job.jobId}</code>
                        {getStatusBadge(job.status)}
                        {isAdmin && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={openStatusModal}
                                title="Change status"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Change Status
                            </button>
                        )}
                    </div>
                    <h2>{job.title}</h2>
                </div>
                <div className="page-header-actions">
                    {isAdmin && (
                        <button className="btn btn-secondary" onClick={openEditModal}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Position
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => navigate('/jobs')}>← Back</button>
                    {isAdmin && <button className="btn btn-primary" onClick={() => navigate('/candidates/create', { state: { jobId: job.id } })}>+ Add Candidate</button>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header"><h3>Position Details</h3></div>
                    <div className="card-body">
                        <div className="detail-grid">
                            <div className="detail-item"><div className="detail-label">Department</div><div className="detail-value">{job.department}</div></div>
                            <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{job.location || '—'}</div></div>
                            <div className="detail-item"><div className="detail-label">Hiring Manager</div><div className="detail-value">{job.managerName}</div></div>
                            <div className="detail-item"><div className="detail-label">Positions</div><div className="detail-value">{job.numberOfPositions}</div></div>
                            <div className="detail-item"><div className="detail-label">Interview Steps</div><div className="detail-value">{job.interviewStepCount}</div></div>
                            <div className="detail-item"><div className="detail-label">Salary Range</div><div className="detail-value">{job.salaryRangeMin && job.salaryRangeMax ? `₹${job.salaryRangeMin.toLocaleString()} - ₹${job.salaryRangeMax.toLocaleString()} LPA` : '—'}</div></div>
                        </div>
                        {job.description && <div style={{ marginTop: 16 }}><div className="detail-label">Description</div><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{job.description}</p></div>}
                        {job.requirements && <div style={{ marginTop: 12 }}><div className="detail-label">Requirements</div><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{job.requirements}</p></div>}
                    </div>
                </div>

                <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><h3>Statistics</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ textAlign: 'center', padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{job.totalCandidates}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: 12, background: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{job.hiredCandidates}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hired</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: 12, background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{job.activeCandidates}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{job.numberOfPositions - job.hiredCandidates}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remaining</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><h3>Interview Process</h3></div>
                        <div className="card-body">
                            {job.interviewSteps?.map((step, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < (job.interviewSteps?.length || 0) - 1 ? '1px solid var(--border-light)' : 'none' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{step.stepNumber}</div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{step.stepName}</div>
                                        {step.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{step.description}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Candidates */}
            <div className="card">
                <div className="card-header">
                    <h3>Candidates ({job.candidates?.length || 0})</h3>
                    {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => navigate('/candidates/create', { state: { jobId: job.id } })}>+ Add Candidate</button>}
                </div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Name</th><th>AlphaCoder</th><th>Progress</th><th>Status</th></tr></thead>
                        <tbody>
                            {job.candidates?.map(c => (
                                <tr key={c.id} onClick={() => navigate(`/candidates/${c.id}`)}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="activity-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                                                {c.photoUrl ? <img src={`${BACKEND_URL}${c.photoUrl}`} alt="" /> : c.fullName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div><div style={{ fontWeight: 600 }}>{c.fullName}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.email}</div></div>
                                        </div>
                                    </td>
                                    <td>{c.alphaCoderScore ? `${c.alphaCoderScore}%` : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, background: 'var(--bg-primary)', borderRadius: 3, maxWidth: 80, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 3, background: c.status === 'Rejected' ? 'var(--danger)' : c.status === 'Recruited' ? 'var(--success)' : 'var(--accent)', width: `${c.totalSteps > 0 ? (c.currentStepNumber / c.totalSteps) * 100 : 0}%` }} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.currentStepNumber}/{c.totalSteps}</span>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(c.status)}</td>
                                </tr>
                            ))}
                            {(!job.candidates || job.candidates.length === 0) && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No candidates yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Change Status Modal */}
            <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change Job Status" width={400}>
                <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
                        Select the new status for <strong>{job.title}</strong>:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                        {['Open', 'OnHold', 'Closed'].map(status => (
                            <label
                                key={status}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${newStatus === status ? 'var(--accent)' : 'var(--border)'}`,
                                    background: newStatus === status ? 'var(--accent-bg)' : 'transparent',
                                    cursor: 'pointer', transition: 'all var(--transition-fast)',
                                }}
                            >
                                <input type="radio" name="job-status" value={status} checked={newStatus === status} onChange={() => setNewStatus(status)} style={{ accentColor: 'var(--accent)' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{status === 'OnHold' ? 'On Hold' : status}</span>
                                <span style={{ marginLeft: 'auto' }}>{getStatusBadge(status)}</span>
                            </label>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setStatusModalOpen(false)} disabled={updating}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleStatusChange} disabled={updating || newStatus === job.status}>
                            {updating ? 'Updating...' : 'Update Status'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Position Modal */}
            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Position" width={560}>
                <div>
                    {editError && <div className="login-error" style={{ marginBottom: 16 }}>{editError}</div>}
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Title *</label>
                            <input className="form-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Department *</label>
                            <input className="form-input" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <input className="form-input" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Hiring Manager *</label>
                            <input className="form-input" value={editForm.managerName} onChange={e => setEditForm({ ...editForm, managerName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>No. of Positions</label>
                            <input className="form-input" type="number" min="1" value={editForm.numberOfPositions} onChange={e => setEditForm({ ...editForm, numberOfPositions: Number(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label>Salary Min (LPA)</label>
                            <input className="form-input" type="number" value={editForm.salaryRangeMin} onChange={e => setEditForm({ ...editForm, salaryRangeMin: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Salary Max (LPA)</label>
                            <input className="form-input" type="number" value={editForm.salaryRangeMax} onChange={e => setEditForm({ ...editForm, salaryRangeMax: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: 8 }}>
                        <label>Description</label>
                        <textarea className="form-textarea" rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Requirements</label>
                        <textarea className="form-textarea" rows={3} value={editForm.requirements} onChange={e => setEditForm({ ...editForm, requirements: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button className="btn btn-secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
