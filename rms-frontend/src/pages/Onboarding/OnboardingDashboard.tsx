import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi, BACKEND_URL } from '../../services/api';
import type { OnboardingListItem, OnboardingStats } from '../../types';
import Modal from '../../components/Modal';

export default function OnboardingDashboard() {
    const [records, setRecords] = useState<OnboardingListItem[]>([]);
    const [stats, setStats] = useState<OnboardingStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'Employee' | 'Intern'>('Employee');
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    // Date filter — default to current year
    const currentYear = new Date().getFullYear();
    const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
    const [dateTo, setDateTo] = useState('');

    // Stats popup
    const [statsPopup, setStatsPopup] = useState<{ title: string; items: OnboardingListItem[] } | null>(null);

    useEffect(() => { loadData(); }, [tab, search, dateFrom, dateTo]);

    const loadData = async () => {
        try {
            const dateParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
            const [recordsRes, statsRes] = await Promise.all([
                onboardingApi.getAll({ type: tab, search: search || undefined, ...dateParams }),
                onboardingApi.getStats(dateParams),
            ]);
            setRecords(recordsRes.data);
            setStats(statsRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const getStatusBadge = (status: string) => {
        const cls: Record<string, string> = {
            Active: 'badge-progress',
            Completed: 'badge-recruited',
            Terminated: 'badge-rejected',
        };
        return <span className={`badge ${cls[status] || ''}`}>{status}</span>;
    };

    const getProgressWidth = (completed: number, total: number) =>
        total > 0 ? Math.round((completed / total) * 100) : 0;

    // Load filtered records for stat card popup
    const openStatsPopup = async (title: string, type?: string, status?: string) => {
        try {
            const dateParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
            const { data } = await onboardingApi.getAll({ type, status, ...dateParams });
            setStatsPopup({ title, items: data });
        } catch { /* ignore */ }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Onboarding</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Track employee & intern probation progress</p>
                </div>
            </div>

            {/* Date Filter */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From</label>
                    <input type="date" className="form-input" style={{ padding: '6px 10px', maxWidth: 160 }}
                        value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To</label>
                    <input type="date" className="form-input" style={{ padding: '6px 10px', maxWidth: 160 }}
                        value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(`${currentYear}-01-01`); setDateTo(''); }}>
                    Reset to {currentYear}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                    All Time
                </button>
            </div>

            {/* Stats Cards — now clickable */}
            {stats && (
                <div className="stats-grid" style={{ marginBottom: 24 }}>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openStatsPopup('Active Employees', 'Employee', 'Active')}>
                        <div className="stat-icon" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.activeEmployees}</div>
                            <div className="stat-label">Active Employees</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openStatsPopup('Active Interns', 'Intern', 'Active')}>
                        <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.activeInterns}</div>
                            <div className="stat-label">Active Interns</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openStatsPopup('Completed', undefined, 'Completed')}>
                        <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.completed}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => openStatsPopup('All Records')}>
                        <div className="stat-icon" style={{ background: '#f0f0f5', color: 'var(--text-secondary)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs + Search */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
                        {(['Employee', 'Intern'] as const).map(t => (
                            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setTab(t)} style={{ minWidth: 100 }}>
                                {t === 'Employee' ? `Employees (${stats?.totalEmployees || 0})` : `Interns (${stats?.totalInterns || 0})`}
                            </button>
                        ))}
                    </div>
                    <div className="search-input-wrap" style={{ maxWidth: 260 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input className="search-input" placeholder="Search by name or GHR-ID..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th><th>GHR ID</th><th>Department</th><th>Date of Joining</th><th>Probation Progress</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id} onClick={() => navigate(`/onboarding/${r.id}`)}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="activity-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                                                {r.photoUrl ? <img src={`${BACKEND_URL}${r.photoUrl}`} alt="" /> : r.fullName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{r.fullName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.designation || r.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><code style={{ background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent)', fontWeight: 600 }}>{r.ghrId || '—'}</code></td>
                                    <td>{r.department || '—'}</td>
                                    <td>{new Date(r.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, background: 'var(--bg-primary)', borderRadius: 3, maxWidth: 80, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
                                                    background: r.status === 'Completed' ? 'var(--success)' : 'var(--accent)',
                                                    width: `${getProgressWidth(r.completedMilestones, r.evaluationMonths)}%` }} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.completedMilestones}/{r.evaluationMonths}</span>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(r.status)}</td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No {tab.toLowerCase()}s found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats Popup Modal */}
            <Modal isOpen={!!statsPopup} onClose={() => setStatsPopup(null)} title={statsPopup?.title || ''} width={650}>
                <div>
                    {statsPopup && statsPopup.items.length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No records found</p>
                    )}
                    {statsPopup && statsPopup.items.map(r => (
                        <div key={r.id} onClick={() => { setStatsPopup(null); navigate(`/onboarding/${r.id}`); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)',
                                cursor: 'pointer', transition: 'background 0.2s', marginBottom: 4, border: '1px solid var(--border-light)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <div className="activity-avatar" style={{ width: 40, height: 40, fontSize: '0.85rem', flexShrink: 0 }}>
                                {r.photoUrl ? <img src={`${BACKEND_URL}${r.photoUrl}`} alt="" /> : r.fullName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{r.fullName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.department || '—'} • {r.designation || r.email}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className={`badge ${r.type === 'Employee' ? 'badge-progress' : 'badge-new'}`} style={{ marginRight: 6 }}>{r.type}</span>
                                {getStatusBadge(r.status)}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
