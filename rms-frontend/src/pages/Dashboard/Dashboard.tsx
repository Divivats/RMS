import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, candidatesApi, jobsApi, BACKEND_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { DashboardStats, RecentActivity, PipelineStage, CandidateListItem, JobPosition } from '../../types';
import Modal from '../../components/Modal';

export default function Dashboard() {
    const { user, isProjectManager, isMD } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activity, setActivity] = useState<RecentActivity[]>([]);
    const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
    const [recentCandidates, setRecentCandidates] = useState<CandidateListItem[]>([]);
    const [pmJobs, setPmJobs] = useState<JobPosition[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Date filter — default to current year
    const currentYear = new Date().getFullYear();
    const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
    const [dateTo, setDateTo] = useState('');

    // Modal state
    const [selectedStat, setSelectedStat] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, [dateFrom, dateTo]);

    const loadData = async () => {
        try {
            const dateParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
            const [statsRes, activityRes, pipelineRes] = await Promise.all([
                dashboardApi.getStats(dateParams),
                dashboardApi.getRecentActivity(dateParams),
                dashboardApi.getPipeline(dateParams),
            ]);
            setStats(statsRes.data);
            setActivity(activityRes.data);
            setPipeline(pipelineRes.data);

            // PM/MD: also load jobs for the approval table
            if (isProjectManager || isMD) {
                const jobsRes = await jobsApi.getAll(dateParams);
                setPmJobs(jobsRes.data);
            }

            // Only load candidates for Admin/Consultant
            if (!isProjectManager && !isMD) {
                const candidatesRes = await candidatesApi.getAll({ ...dateParams });
                setRecentCandidates(candidatesRes.data.slice(0, 5));
            }
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div className="stat-card" key={i}>
                            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
                            <div className="skeleton" style={{ width: 60, height: 28, marginTop: 12 }} />
                            <div className="skeleton" style={{ width: 100, height: 14, marginTop: 6 }} />
                        </div>
                    ))}
                </div>
                <div className="dashboard-grid" style={{ marginTop: 20 }}>
                    <div className="card"><div style={{ padding: 24 }}>{[1, 2, 3, 4].map(i => (<div key={i} style={{ marginBottom: 16 }}><div className="skeleton" style={{ height: 40, width: '100%' }} /></div>))}</div></div>
                    <div className="card"><div style={{ padding: 24 }}>{[1, 2, 3].map(i => (<div key={i} style={{ marginBottom: 16 }}><div className="skeleton" style={{ height: 32, width: '100%' }} /></div>))}</div></div>
                </div>
            </div>
        );
    }

    const maxPipeline = Math.max(...pipeline.map(p => p.count), 1);
    const pipelineColors = ['blue', 'orange', 'green', 'red'];

    const handleStatClick = async (statType: string) => {
        setSelectedStat(statType);
        setModalLoading(true);
        setSearchQuery('');
        setModalData([]);

        try {
            const dateParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
            if (statType === 'jobs') {
                const res = await jobsApi.getAll({ ...dateParams });
                setModalData(res.data);
            } else if (statType === 'hired') {
                const res = await candidatesApi.getAll({ status: 'Recruited', ...dateParams });
                setModalData(res.data);
            } else if (statType === 'pipeline') {
                const res = await candidatesApi.getAll({ status: 'InProgress', ...dateParams });
                setModalData(res.data);
            } else if (statType === 'rate') {
                const res = await candidatesApi.getAll({ ...dateParams });
                setModalData(res.data);
            }
        } catch (err) {
            console.error('Failed to load modal data:', err);
        } finally {
            setModalLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            New: 'badge-new',
            InProgress: 'badge-progress',
            Recruited: 'badge-recruited',
            Rejected: 'badge-rejected',
        };
        const labels: Record<string, string> = {
            New: 'New',
            InProgress: 'In Progress',
            Recruited: 'Recruited',
            Rejected: 'Rejected',
        };
        return <span className={`badge ${map[status] || ''}`}>{labels[status] || status}</span>;
    };

    const getApprovalBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string; label: string }> = {
            PendingMDApproval: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'Pending MD' },
            MDApproved: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'MD Approved' },
            MDRejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Rejected' },
            Active: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Active' },
            Draft: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: 'Draft' },
        };
        const s = styles[status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: status };
        return (
            <span style={{
                background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20,
                fontSize: '0.75rem', fontWeight: 600, display: 'inline-block',
            }}>
                {s.label}
            </span>
        );
    };

    const timeAgo = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    // ── Date filter bar (shared) ──
    const DateFilterBar = () => (
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
    );

    // ═══════════════════════════════════════════════════════
    // PM Dashboard
    // ═══════════════════════════════════════════════════════
    if (isProjectManager) {
        const pendingJobs = pmJobs.filter(j => j.approvalStatus === 'PendingMDApproval');
        const rejectedJobs = pmJobs.filter(j => j.approvalStatus === 'MDRejected');
        const activeJobs = pmJobs.filter(j => j.approvalStatus === 'Active');
        const approvedJobs = pmJobs.filter(j => j.approvalStatus === 'MDApproved');

        return (
            <div>
                <DateFilterBar />

                {/* PM Stats */}
                <div className="stats-grid">
                    <div className="stat-card blue">
                        <div className="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div>
                        <div className="stat-value">{stats?.totalJobs || 0}</div>
                        <div className="stat-label">My Jobs</div>
                    </div>
                    <div className="stat-card orange">
                        <div className="stat-icon orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                        <div className="stat-value">{stats?.pendingApproval || 0}</div>
                        <div className="stat-label">Pending Approval</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                        <div className="stat-value">{stats?.approvedJobs || 0}</div>
                        <div className="stat-label">Approved / Active</div>
                    </div>
                    <div className="stat-card red">
                        <div className="stat-icon red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                        <div className="stat-value">{stats?.rejectedJobs || 0}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>

                {/* Rejected jobs needing attention */}
                {rejectedJobs.length > 0 && (
                    <div className="card" style={{ marginTop: 20, borderLeft: '3px solid var(--danger)' }}>
                        <div className="card-header">
                            <h3 style={{ color: 'var(--danger)' }}>⚠ Rejected — Action Required</h3>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Job ID</th><th>Title</th><th>Department</th><th>Comments</th><th>Action</th></tr></thead>
                                <tbody>
                                    {rejectedJobs.map(j => (
                                        <tr key={j.id}>
                                            <td style={{ fontWeight: 600 }}>{j.jobId}</td>
                                            <td>{j.title}</td>
                                            <td>{j.department}</td>
                                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {(j as any).approvalComments || '—'}
                                            </td>
                                            <td>
                                                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/jobs/${j.id}`)}>
                                                    Edit & Resubmit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* My Jobs Table */}
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3>My Job Positions</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs/create')}>
                            + Create Job
                        </button>
                    </div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Job ID</th><th>Title</th><th>Department</th><th>Positions</th><th>Approval Status</th><th>Candidates</th><th>Created</th></tr></thead>
                            <tbody>
                                {pmJobs.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No jobs created yet. Create your first job position!</td></tr>
                                ) : (
                                    pmJobs.map(j => (
                                        <tr key={j.id} onClick={() => navigate(`/jobs/${j.id}`)} style={{ cursor: 'pointer' }}>
                                            <td style={{ fontWeight: 600 }}>{j.jobId}</td>
                                            <td>{j.title}</td>
                                            <td>{j.department}</td>
                                            <td>{j.numberOfPositions}</td>
                                            <td>{getApprovalBadge(j.approvalStatus)}</td>
                                            <td>{j.totalCandidates}</td>
                                            <td>{new Date(j.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Activity & Pipeline for PM's jobs */}
                <div className="dashboard-grid" style={{ marginTop: 20 }}>
                    <div className="card">
                        <div className="card-header"><h3>Activity on My Jobs</h3></div>
                        <div className="card-body" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                            {activity.length === 0 ? (
                                <div className="empty-state"><h3>No activity yet</h3><p>Activity will appear here as candidates progress.</p></div>
                            ) : (
                                activity.map((item, i) => (
                                    <div className="activity-item" key={i}>
                                        <div className="activity-avatar">
                                            {item.candidatePhoto ? (<img src={`${BACKEND_URL}${item.candidatePhoto}`} alt="" />) : (item.candidateName.split(' ').map(n => n[0]).join(''))}
                                        </div>
                                        <div className="activity-info">
                                            <div className="activity-name">{item.candidateName}</div>
                                            <div className="activity-desc">{item.action} — {item.jobTitle}</div>
                                        </div>
                                        <div>{getStatusBadge(item.status)}</div>
                                        <div className="activity-time">{timeAgo(item.timestamp)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3>Pipeline</h3></div>
                        <div className="card-body">
                            {pipeline.map((stage, i) => (
                                <div className="pipeline-stage" key={stage.stageName}>
                                    <div className="pipeline-label">{stage.stageName}</div>
                                    <div className="pipeline-bar-wrap">
                                        <div className={`pipeline-bar ${pipelineColors[i]}`} style={{ width: `${(stage.count / maxPipeline) * 100}%` }} />
                                    </div>
                                    <div className="pipeline-count">{stage.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════
    // MD Dashboard
    // ═══════════════════════════════════════════════════════
    if (isMD) {
        const pendingJobs = pmJobs.filter(j => j.approvalStatus === 'PendingMDApproval');
        const approvedJobs = pmJobs.filter(j => j.approvalStatus === 'MDApproved' || j.approvalStatus === 'Active');

        return (
            <div>
                <DateFilterBar />

                {/* MD Stats */}
                <div className="stats-grid">
                    <div className="stat-card orange">
                        <div className="stat-icon orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                        <div className="stat-value">{stats?.pendingApproval || 0}</div>
                        <div className="stat-label">Pending Approvals</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                        <div className="stat-value">{stats?.approvedJobs || 0}</div>
                        <div className="stat-label">Approved</div>
                    </div>
                    <div className="stat-card blue">
                        <div className="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div>
                        <div className="stat-value">{stats?.totalJobs || 0}</div>
                        <div className="stat-label">Total Jobs</div>
                    </div>
                    <div className="stat-card red">
                        <div className="stat-icon red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                        <div className="stat-value">{stats?.rejectedJobs || 0}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>

                {/* Pending Approvals — prominent */}
                <div className="card" style={{ marginTop: 20, borderLeft: '3px solid #fbbf24' }}>
                    <div className="card-header">
                        <h3 style={{ color: '#fbbf24' }}>⏳ Pending Approvals</h3>
                    </div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Job ID</th><th>Title</th><th>Department</th><th>Location</th><th>Positions</th><th>Created</th><th>Action</th></tr></thead>
                            <tbody>
                                {pendingJobs.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No jobs pending your approval.</td></tr>
                                ) : (
                                    pendingJobs.map(j => (
                                        <tr key={j.id}>
                                            <td style={{ fontWeight: 600 }}>{j.jobId}</td>
                                            <td>{j.title}</td>
                                            <td>{j.department}</td>
                                            <td>{j.location || '—'}</td>
                                            <td>{j.numberOfPositions}</td>
                                            <td>{new Date(j.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/jobs/${j.id}`)}>
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* All Jobs overview */}
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>All Job Positions</h3></div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Job ID</th><th>Title</th><th>Department</th><th>Status</th><th>Approval</th><th>Candidates</th></tr></thead>
                            <tbody>
                                {pmJobs.filter(j => j.approvalStatus !== 'PendingMDApproval').map(j => (
                                    <tr key={j.id} onClick={() => navigate(`/jobs/${j.id}`)} style={{ cursor: 'pointer' }}>
                                        <td style={{ fontWeight: 600 }}>{j.jobId}</td>
                                        <td>{j.title}</td>
                                        <td>{j.department}</td>
                                        <td>{getStatusBadge(j.status)}</td>
                                        <td>{getApprovalBadge(j.approvalStatus)}</td>
                                        <td>{j.totalCandidates}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Activity & Pipeline */}
                <div className="dashboard-grid" style={{ marginTop: 20 }}>
                    <div className="card">
                        <div className="card-header"><h3>Recent Activity</h3></div>
                        <div className="card-body" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                            {activity.length === 0 ? (
                                <div className="empty-state"><h3>No activity yet</h3></div>
                            ) : (
                                activity.map((item, i) => (
                                    <div className="activity-item" key={i}>
                                        <div className="activity-avatar">
                                            {item.candidatePhoto ? (<img src={`${BACKEND_URL}${item.candidatePhoto}`} alt="" />) : (item.candidateName.split(' ').map(n => n[0]).join(''))}
                                        </div>
                                        <div className="activity-info">
                                            <div className="activity-name">{item.candidateName}</div>
                                            <div className="activity-desc">{item.action} — {item.jobTitle}</div>
                                        </div>
                                        <div>{getStatusBadge(item.status)}</div>
                                        <div className="activity-time">{timeAgo(item.timestamp)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header"><h3>Pipeline</h3></div>
                        <div className="card-body">
                            {pipeline.map((stage, i) => (
                                <div className="pipeline-stage" key={stage.stageName}>
                                    <div className="pipeline-label">{stage.stageName}</div>
                                    <div className="pipeline-bar-wrap">
                                        <div className={`pipeline-bar ${pipelineColors[i]}`} style={{ width: `${(stage.count / maxPipeline) * 100}%` }} />
                                    </div>
                                    <div className="pipeline-count">{stage.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════
    // Admin / Consultant Dashboard (existing behavior)
    // ═══════════════════════════════════════════════════════
    return (
        <div>
            <DateFilterBar />

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card blue" onClick={() => handleStatClick('jobs')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div>
                    <div className="stat-value">{stats?.totalJobs || 0}</div>
                    <div className="stat-label">Total Positions</div>
                </div>
                <div className="stat-card green" onClick={() => handleStatClick('hired')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                    <div className="stat-value">{stats?.hiredCandidates || 0}</div>
                    <div className="stat-label">Hired</div>
                </div>
                <div className="stat-card orange" onClick={() => handleStatClick('pipeline')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></div>
                    <div className="stat-value">{stats?.activeCandidates || 0}</div>
                    <div className="stat-label">Active Pipeline</div>
                </div>
                <div className="stat-card red" onClick={() => handleStatClick('rate')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
                    <div className="stat-value">{stats?.hiringRate || 0}%</div>
                    <div className="stat-label">Hiring Rate</div>
                </div>
            </div>

            {/* Pending activation notice for Admin */}
            {user?.role === 'Admin' && (stats?.pendingApproval ?? 0) > 0 && (
                <div className="card" style={{ marginTop: 16, borderLeft: '3px solid #3b82f6', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <strong style={{ color: '#3b82f6' }}>📋 {stats?.pendingApproval} job(s) awaiting your activation</strong>
                        <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                            MD-approved jobs are ready for you to activate and begin recruitment.
                        </p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs')}>
                        View Jobs
                    </button>
                </div>
            )}

            {/* Interactive Data Modal */}
            <Modal
                isOpen={!!selectedStat}
                onClose={() => setSelectedStat(null)}
                title={
                    selectedStat === 'jobs' ? 'Active Positions Overview' :
                    selectedStat === 'hired' ? 'Recently Hired Candidates' :
                    selectedStat === 'pipeline' ? 'Active Pipeline Breakdown' :
                    'Hiring Rate Analysis'
                }
                width={800}
            >
                <div style={{ marginBottom: 16 }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search records..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ maxWidth: 300 }}
                    />
                </div>
                
                {modalLoading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : (
                    <div className="table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {selectedStat === 'jobs' ? (
                                        <><th>Job Title</th><th>Department</th><th>Location</th><th>Status</th></>
                                    ) : (
                                        <><th>Candidate Name</th><th>Position</th><th>Email</th><th>Status</th></>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filtered = modalData.filter((item: any) => {
                                        const query = searchQuery.toLowerCase();
                                        if (selectedStat === 'jobs') {
                                            return item.title?.toLowerCase().includes(query) || item.department?.toLowerCase().includes(query);
                                        } else {
                                            return item.fullName?.toLowerCase().includes(query) || item.jobTitle?.toLowerCase().includes(query);
                                        }
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                                                    No records found matching your search.
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return filtered.map((item: any) => (
                                        <tr key={item.id} onClick={() => navigate(selectedStat === 'jobs' ? `/jobs/${item.id}` : `/candidates/${item.id}`)} style={{ cursor: 'pointer' }}>
                                            {selectedStat === 'jobs' ? (
                                                <>
                                                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                                                    <td>{item.department || '—'}</td>
                                                    <td>{item.location || '—'}</td>
                                                    <td>{getStatusBadge(item.status)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ fontWeight: 600 }}>{item.fullName}</td>
                                                    <td>{item.jobTitle}</td>
                                                    <td>{item.email}</td>
                                                    <td>{getStatusBadge(item.status)}</td>
                                                </>
                                            )}
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            {/* Main Grid */}
            <div className="dashboard-grid">
                {/* Recent Activity */}
                <div className="card">
                    <div className="card-header">
                        <h3>Recent Activity</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/candidates')}>
                            View All
                        </button>
                    </div>
                    <div className="card-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        {activity.length === 0 ? (
                            <div className="empty-state">
                                <h3>No activity yet</h3>
                                <p>Activity will appear here as candidates progress through interviews.</p>
                            </div>
                        ) : (
                            activity.map((item, i) => (
                                <div className="activity-item" key={i}>
                                    <div className="activity-avatar">
                                        {item.candidatePhoto ? (
                                            <img src={`${BACKEND_URL}${item.candidatePhoto}`} alt="" />
                                        ) : (
                                            item.candidateName.split(' ').map(n => n[0]).join('')
                                        )}
                                    </div>
                                    <div className="activity-info">
                                        <div className="activity-name">{item.candidateName}</div>
                                        <div className="activity-desc">{item.action} — {item.jobTitle}</div>
                                    </div>
                                    <div>
                                        {getStatusBadge(item.status)}
                                    </div>
                                    <div className="activity-time">{timeAgo(item.timestamp)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pipeline */}
                <div className="card">
                    <div className="card-header">
                        <h3>Hiring Pipeline</h3>
                    </div>
                    <div className="card-body">
                        {pipeline.map((stage, i) => (
                            <div className="pipeline-stage" key={stage.stageName}>
                                <div className="pipeline-label">{stage.stageName}</div>
                                <div className="pipeline-bar-wrap">
                                    <div
                                        className={`pipeline-bar ${pipelineColors[i]}`}
                                        style={{ width: `${(stage.count / maxPipeline) * 100}%` }}
                                    />
                                </div>
                                <div className="pipeline-count">{stage.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Candidates Table */}
            <div className="card">
                <div className="card-header">
                    <h3>Latest Candidates</h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/candidates')}>
                        View All
                    </button>
                </div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Position</th>
                                <th>AlphaCoder</th>
                                <th>Progress</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentCandidates.map((c) => (
                                <tr key={c.id} onClick={() => navigate(`/candidates/${c.id}`)}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="activity-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                                                {c.photoUrl ? (
                                                    <img src={`${BACKEND_URL}${c.photoUrl}`} alt="" />
                                                ) : (
                                                    c.fullName.split(' ').map(n => n[0]).join('')
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{c.jobTitle}</td>
                                    <td>{c.alphaCoderScore ? `${c.alphaCoderScore}%` : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                                                <div style={{
                                                    height: '100%',
                                                    borderRadius: 3,
                                                    background: c.status === 'Rejected' ? 'var(--danger)' : c.status === 'Recruited' ? 'var(--success)' : 'var(--accent)',
                                                    width: `${c.totalSteps > 0 ? (c.currentStepNumber / c.totalSteps) * 100 : 0}%`,
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.currentStepNumber}/{c.totalSteps}</span>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(c.status)}</td>
                                </tr>
                            ))}
                            {recentCandidates.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                        No candidates yet. Add your first candidate to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
