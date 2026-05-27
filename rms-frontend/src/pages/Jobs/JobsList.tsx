import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../../services/api';
import type { JobPosition } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function JobsList() {
    const [jobs, setJobs] = useState<JobPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Date filter — default to current year
    const currentYear = new Date().getFullYear();
    const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
    const [dateTo, setDateTo] = useState('');

    useEffect(() => { loadJobs(); }, [search, statusFilter, dateFrom, dateTo]);

    const loadJobs = async () => {
        try {
            const dateParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
            const { data } = await jobsApi.getAll({ search, status: statusFilter, ...dateParams });
            setJobs(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const getStatusBadge = (status: string) => {
        const cls: Record<string, string> = { Open: 'badge-open', Closed: 'badge-closed', OnHold: 'badge-onhold' };
        return <span className={`badge ${cls[status] || ''}`}>{status === 'OnHold' ? 'On Hold' : status}</span>;
    };

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <h2>Job Positions</h2>
                </div>
                <div className="card">
                    <div style={{ padding: 24 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="skeleton-row" style={{ marginBottom: 16 }}>
                                <div className="skeleton" style={{ height: 20, width: '25%', marginBottom: 8 }} />
                                <div className="skeleton" style={{ height: 14, width: '60%' }} />
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
                <h2>Job Positions ({jobs.length})</h2>
                {isAdmin && (
                    <div className="page-header-actions">
                        <button className="btn btn-primary" onClick={() => navigate('/jobs/create')}>+ New Position</button>
                    </div>
                )}
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

            <div className="search-bar">
                <div className="search-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input className="search-input" placeholder="Search positions..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-group">
                    {['', 'Open', 'Closed', 'OnHold'].map(f => (
                        <button key={f} className={`filter-btn ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
                            {f || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Job ID</th>
                                <th>Title</th>
                                <th>Department</th>
                                <th>Manager</th>
                                <th>Positions</th>
                                <th>Candidates</th>
                                <th>Hired</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((j, idx) => (
                                <tr key={j.id} onClick={() => navigate(`/jobs/${j.id}`)} className="stagger-row" style={{ animationDelay: `${idx * 40}ms` }}>
                                    <td><code style={{ background: 'var(--accent-bg)', padding: '3px 8px', borderRadius: 4, fontWeight: 600, color: 'var(--accent)' }}>{j.jobId}</code></td>
                                    <td style={{ fontWeight: 600 }}>{j.title}</td>
                                    <td>{j.department}</td>
                                    <td>{j.managerName}</td>
                                    <td>{j.numberOfPositions}</td>
                                    <td>{j.totalCandidates}</td>
                                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{j.hiredCandidates}</span></td>
                                    <td>{getStatusBadge(j.status)}</td>
                                </tr>
                            ))}
                            {jobs.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No job positions found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
