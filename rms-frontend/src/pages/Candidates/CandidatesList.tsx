import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { candidatesApi } from '../../services/api';
import type { CandidateListItem } from '../../types';

export default function CandidatesList() {
    const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => { loadCandidates(); }, [search, statusFilter]);

    const loadCandidates = async () => {
        try {
            const { data } = await candidatesApi.getAll({ search, status: statusFilter });
            setCandidates(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const getStatusBadge = (status: string) => {
        const cls: Record<string, string> = { New: 'badge-new', InProgress: 'badge-progress', Recruited: 'badge-recruited', Rejected: 'badge-rejected' };
        const labels: Record<string, string> = { InProgress: 'In Progress' };
        return <span className={`badge ${cls[status] || ''}`}>{labels[status] || status}</span>;
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <h2>Candidates ({candidates.length})</h2>
            </div>

            <div className="search-bar">
                <div className="search-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input className="search-input" placeholder="Search candidates..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-group">
                    {['', 'New', 'InProgress', 'Recruited', 'Rejected'].map(f => (
                        <button key={f} className={`filter-btn ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
                            {f === 'InProgress' ? 'In Progress' : f || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Position</th>
                                <th>Experience</th>
                                <th>AlphaCoder</th>
                                <th>Progress</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.map(c => (
                                <tr key={c.id} onClick={() => navigate(`/candidates/${c.id}`)}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="activity-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                                                {c.photoUrl ? <img src={`http://localhost:5275${c.photoUrl}`} alt="" /> : c.fullName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{c.jobTitle}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.jobId}</div>
                                    </td>
                                    <td>{c.experienceYears ? `${c.experienceYears} yrs` : '—'}</td>
                                    <td>
                                        {c.alphaCoderScore ? (
                                            <span style={{ fontWeight: 600, color: (c.alphaCoderScore >= 70 ? 'var(--success)' : c.alphaCoderScore >= 50 ? 'var(--warning)' : 'var(--danger)') }}>{c.alphaCoderScore}%</span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, background: 'var(--bg-primary)', borderRadius: 3, maxWidth: 80, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 3, background: c.status === 'Rejected' ? 'var(--danger)' : c.status === 'Recruited' ? 'var(--success)' : 'var(--accent)', width: `${c.totalSteps > 0 ? (c.currentStepNumber / c.totalSteps) * 100 : 0}%`, transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{c.currentStepNumber}/{c.totalSteps}</span>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(c.status)}</td>
                                </tr>
                            ))}
                            {candidates.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No candidates found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
