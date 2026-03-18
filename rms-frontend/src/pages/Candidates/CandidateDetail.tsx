import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { candidatesApi } from '../../services/api';
import type { CandidateDetail as CandidateDetailType } from '../../types';
export default function CandidateDetail() {
    const { id } = useParams();
    const [candidate, setCandidate] = useState<CandidateDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEval, setShowEval] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => { loadCandidate(); }, [id]);

    const loadCandidate = async () => {
        try {
            const { data } = await candidatesApi.getById(Number(id));
            setCandidate(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const getStatusBadge = (status: string) => {
        const cls: Record<string, string> = { New: 'badge-new', InProgress: 'badge-progress', Recruited: 'badge-recruited', Rejected: 'badge-rejected', Passed: 'badge-passed', Failed: 'badge-failed', Pending: 'badge-pending' };
        const labels: Record<string, string> = { InProgress: 'In Progress' };
        return <span className={`badge ${cls[status] || ''}`}>{labels[status] || status}</span>;
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`star ${i < Math.round(rating) ? '' : 'empty'}`}>★</span>
        ));
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!candidate) return <div className="empty-state"><h3>Candidate not found</h3></div>;

    const nextPendingStep = candidate.interviews.find(i => i.status === 'Pending');
    const initials = candidate.fullName.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <div>
            <div className="page-header">
                <h2>Candidate Profile</h2>
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
            </div>

            {/* Profile Header */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-body">
                    <div className="profile-header">
                        <div className="profile-photo">
                            {candidate.photoUrl ? (
                                <img src={`http://localhost:5275${candidate.photoUrl}`} alt={candidate.fullName} />
                            ) : initials}
                        </div>
                        <div className="profile-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="profile-name">{candidate.fullName}</div>
                                {getStatusBadge(candidate.status)}
                            </div>
                            <div className="profile-meta">
                                <div className="profile-meta-item">📧 {candidate.email}</div>
                                {candidate.phone && <div className="profile-meta-item">📱 {candidate.phone}</div>}
                                {candidate.currentCompany && <div className="profile-meta-item">🏢 {candidate.currentCompany}</div>}
                                {candidate.currentPosition && <div className="profile-meta-item">💼 {candidate.currentPosition}</div>}
                            </div>
                            <div className="profile-stats">
                                <div className="profile-stat">
                                    <div className="profile-stat-value">{candidate.currentStepNumber}/{candidate.totalSteps}</div>
                                    <div className="profile-stat-label">Steps Done</div>
                                </div>
                                {candidate.alphaCoderScore && (
                                    <div className="profile-stat">
                                        <div className="profile-stat-value" style={{ color: candidate.alphaCoderScore >= 70 ? 'var(--success)' : candidate.alphaCoderScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{candidate.alphaCoderScore}%</div>
                                        <div className="profile-stat-label">AlphaCoder</div>
                                    </div>
                                )}
                                {candidate.experienceYears && (
                                    <div className="profile-stat">
                                        <div className="profile-stat-value">{candidate.experienceYears}</div>
                                        <div className="profile-stat-label">Years Exp</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Details */}
                <div className="card">
                    <div className="card-header"><h3>Candidate Details</h3></div>
                    <div className="card-body">
                        <div className="detail-grid">
                            <div className="detail-item"><div className="detail-label">Position</div><div className="detail-value">{candidate.jobTitle}</div></div>
                            <div className="detail-item"><div className="detail-label">Job ID</div><div className="detail-value"><code style={{ background: 'var(--accent-bg)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)' }}>{candidate.jobId}</code></div></div>
                            <div className="detail-item"><div className="detail-label">Department</div><div className="detail-value">{candidate.department || '—'}</div></div>
                            <div className="detail-item"><div className="detail-label">Manager</div><div className="detail-value">{candidate.managerName || '—'}</div></div>
                            <div className="detail-item"><div className="detail-label">Skills</div><div className="detail-value">{candidate.skills || '—'}</div></div>
                            <div className="detail-item"><div className="detail-label">Applied</div><div className="detail-value">{new Date(candidate.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
                        </div>
                        {candidate.notes && <div style={{ marginTop: 12 }}><div className="detail-label">Notes</div><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{candidate.notes}</p></div>}
                    </div>
                </div>

                {/* Next Action */}
                <div className="card">
                    <div className="card-header"><h3>Interview Progress</h3></div>
                    <div className="card-body">
                        {/* Progress Bar */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {candidate.status === 'Recruited' ? 'Completed' : candidate.status === 'Rejected' ? 'Rejected' : `Step ${candidate.currentStepNumber} of ${candidate.totalSteps}`}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {candidate.totalSteps > 0 ? Math.round((candidate.currentStepNumber / candidate.totalSteps) * 100) : 0}%
                                </span>
                            </div>
                            <div style={{ height: 10, background: 'var(--bg-primary)', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 5, transition: 'width 0.8s ease',
                                    background: candidate.status === 'Rejected' ? 'var(--danger)' : candidate.status === 'Recruited' ? 'var(--success)' : 'var(--accent)',
                                    width: `${candidate.totalSteps > 0 ? (candidate.currentStepNumber / candidate.totalSteps) * 100 : 0}%`,
                                }} />
                            </div>
                        </div>

                        {nextPendingStep && candidate.status !== 'Rejected' && (
                            <button className="btn btn-primary btn-full" style={{ marginBottom: 16 }}
                                onClick={() => navigate(`/interviews/${candidate.id}/step/${nextPendingStep.stepNumber}`)}>
                                Conduct {nextPendingStep.stepName} →
                            </button>
                        )}

                        {candidate.status === 'Recruited' && (
                            <div style={{ textAlign: 'center', padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--success-text)', fontWeight: 600 }}>
                                ✅ Candidate has been successfully recruited!
                            </div>
                        )}

                        {candidate.status === 'Rejected' && (
                            <div style={{ textAlign: 'center', padding: 16, background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontWeight: 600 }}>
                                ❌ Candidate was rejected at step {candidate.currentStepNumber}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interview Timeline */}
            <div className="card">
                <div className="card-header"><h3>Interview Timeline</h3></div>
                <div className="card-body">
                    <div className="timeline">
                        {candidate.interviews.map((interview, i) => {
                            const isCurrent = interview.status === 'Pending' && (i === 0 || candidate.interviews[i - 1].status !== 'Pending');
                            const dotClass = interview.status === 'Passed' ? 'passed' : interview.status === 'Failed' ? 'failed' : isCurrent ? 'current' : 'pending';

                            return (
                                <div className="timeline-step" key={interview.stepNumber} style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className={`timeline-dot ${dotClass}`}>
                                        {interview.status === 'Passed' ? '✓' : interview.status === 'Failed' ? '✕' : interview.stepNumber}
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <div className="timeline-title">{interview.stepName}</div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                {getStatusBadge(interview.status)}
                                                {interview.status !== 'Pending' && (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowEval(showEval === interview.id ? null : interview.id)}>
                                                        {showEval === interview.id ? 'Hide' : 'View'} Feedback
                                                    </button>
                                                )}
                                                {interview.status === 'Pending' && isCurrent && candidate.status !== 'Rejected' && (
                                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/interviews/${candidate.id}/step/${interview.stepNumber}`)}>
                                                        Evaluate
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {interview.status !== 'Pending' && (
                                            <div className="timeline-details">
                                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                                                    {interview.interviewerName && <span>👤 {interview.interviewerName}</span>}
                                                    {interview.interviewDate && <span>📅 {new Date(interview.interviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                                    {interview.conductedByName && <span>📝 by {interview.conductedByName}</span>}
                                                </div>
                                                {interview.overallRating && (
                                                    <div className="timeline-rating">{renderStars(interview.overallRating)} <span style={{ marginLeft: 4, fontSize: '0.85rem', fontWeight: 600 }}>{interview.overallRating}/5</span></div>
                                                )}
                                                {interview.comments && <p style={{ marginTop: 6 }}>"{interview.comments}"</p>}
                                            </div>
                                        )}

                                        {/* Expanded Evaluations */}
                                        {showEval === interview.id && interview.evaluations.length > 0 && (
                                            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                                <h4 style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-primary)' }}>Evaluation Details</h4>
                                                {Object.entries(
                                                    interview.evaluations.reduce<Record<string, typeof interview.evaluations>>((groups, e) => {
                                                        (groups[e.category] = groups[e.category] || []).push(e);
                                                        return groups;
                                                    }, {})
                                                ).map(([category, evals]) => (
                                                    <div key={category} style={{ marginBottom: 12 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{category}</div>
                                                        {evals.map(e => (
                                                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                                                                <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{e.questionText}</span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div style={{ display: 'flex', gap: 2 }}>{renderStars(e.rating)}</div>
                                                                    {e.remarks && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.remarks}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
