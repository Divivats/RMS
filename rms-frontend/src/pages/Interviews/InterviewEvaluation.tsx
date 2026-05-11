import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewsApi, candidatesApi, BACKEND_URL } from '../../services/api';
import type { EvaluationQuestion, CandidateDetail } from '../../types';

export default function InterviewEvaluation() {
    const { candidateId, stepNumber } = useParams();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
    const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        interviewerName: '',
        interviewDate: new Date().toISOString().split('T')[0],
        comments: '',
        overallRating: 0,
        status: 'Passed',
    });

    const [ratings, setRatings] = useState<Record<number, { rating: number; remarks: string }>>({});

    useEffect(() => { loadData(); }, [candidateId, stepNumber]);

    const loadData = async () => {
        try {
            const [candRes, questRes] = await Promise.all([
                candidatesApi.getById(Number(candidateId)),
                interviewsApi.getQuestions(),
            ]);
            setCandidate(candRes.data);
            setQuestions(questRes.data);
            const initial: Record<number, { rating: number; remarks: string }> = {};
            questRes.data.forEach((q: EvaluationQuestion) => { initial[q.id] = { rating: 0, remarks: '' }; });
            setRatings(initial);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const setRating = (qId: number, rating: number) => {
        setRatings({ ...ratings, [qId]: { ...ratings[qId], rating } });
    };

    const setRemarks = (qId: number, remarks: string) => {
        setRatings({ ...ratings, [qId]: { ...ratings[qId], remarks } });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        const unanswered = questions.filter(q => !ratings[q.id]?.rating);
        if (unanswered.length > 0) {
            setError('Please rate all evaluation criteria before submitting.');
            return;
        }

        if (!form.overallRating) {
            setError('Please provide an overall rating.');
            return;
        }

        setSubmitting(true);
        try {
            const evaluations = questions.map(q => ({
                questionId: q.id,
                rating: ratings[q.id].rating,
                remarks: ratings[q.id].remarks || null,
            }));

            await interviewsApi.advance({
                candidateId: Number(candidateId),
                stepNumber: Number(stepNumber),
                status: form.status,
                interviewDate: form.interviewDate,
                interviewerName: form.interviewerName,
                comments: form.comments,
                overallRating: form.overallRating,
                evaluations,
            });

            navigate(`/candidates/${candidateId}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit evaluation');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!candidate) return <div className="empty-state"><h3>Candidate not found</h3></div>;

    const currentStep = candidate.interviews.find(i => i.stepNumber === Number(stepNumber));
    const groupedQuestions = questions.reduce<Record<string, EvaluationQuestion[]>>((groups, q) => {
        (groups[q.category] = groups[q.category] || []).push(q);
        return groups;
    }, {});

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Interview Evaluation</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {candidate.fullName} — {currentStep?.stepName || `Step ${stepNumber}`}
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate(`/candidates/${candidateId}`)}>← Back to Profile</button>
            </div>

            {/* Candidate Summary */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="profile-photo" style={{ width: 60, height: 60, fontSize: '1.3rem' }}>
                            {candidate.photoUrl ? <img src={`${BACKEND_URL}${candidate.photoUrl}`} alt="" /> : candidate.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{candidate.fullName}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                {candidate.jobTitle} • {candidate.email}
                                {candidate.alphaCoderScore && <span style={{ marginLeft: 12 }}>AlphaCoder: <strong style={{ color: candidate.alphaCoderScore >= 70 ? 'var(--success)' : 'var(--warning)' }}>{candidate.alphaCoderScore}%</strong></span>}
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>Step {stepNumber}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>of {candidate.totalSteps}</div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}

                {/* Interview Info */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Interview Information</h3></div>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Interviewer Name *</label>
                                <input className="form-input" value={form.interviewerName} onChange={e => setForm({ ...form, interviewerName: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Interview Date</label>
                                <input className="form-input" type="date" value={form.interviewDate} onChange={e => setForm({ ...form, interviewDate: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Evaluation Criteria */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Evaluation Criteria</h3><span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Rate each criterion from 1 (Poor) to 5 (Excellent)</span></div>
                    <div className="card-body">
                        {Object.entries(groupedQuestions).map(([category, qs]) => (
                            <div className="eval-category" key={category}>
                                <div className="eval-category-title">{category}</div>
                                {qs.map(q => (
                                    <div className="eval-question" key={q.id}>
                                        <div className="eval-question-text">{q.questionText}</div>
                                        <div className="eval-rating-group">
                                            {[1, 2, 3, 4, 5].map(r => (
                                                <button key={r} type="button" className={`eval-rating-btn ${ratings[q.id]?.rating === r ? 'selected' : ''}`}
                                                    onClick={() => setRating(q.id, r)}>{r}</button>
                                            ))}
                                        </div>
                                        <input className="form-input eval-remarks" placeholder="Remarks (optional)" value={ratings[q.id]?.remarks || ''}
                                            onChange={e => setRemarks(q.id, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Overall & Decision */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Overall Assessment</h3></div>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Overall Rating (1-5) *</label>
                                <div className="eval-rating-group">
                                    {[1, 2, 3, 4, 5].map(r => (
                                        <button key={r} type="button" className={`eval-rating-btn ${form.overallRating === r ? 'selected' : ''}`}
                                            style={{ width: 44, height: 44, fontSize: '1rem' }} onClick={() => setForm({ ...form, overallRating: r })}>{r}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Decision *</label>
                                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                    <button type="button" className={`btn ${form.status === 'Passed' ? 'btn-success' : 'btn-secondary'}`}
                                        onClick={() => setForm({ ...form, status: 'Passed' })} style={{ flex: 1 }}>✓ Pass</button>
                                    <button type="button" className={`btn ${form.status === 'Failed' ? 'btn-danger' : 'btn-secondary'}`}
                                        onClick={() => setForm({ ...form, status: 'Failed' })} style={{ flex: 1 }}>✕ Reject</button>
                                </div>
                            </div>
                            <div className="form-group full-width">
                                <label>Comments / Summary</label>
                                <textarea className="form-textarea" rows={4} placeholder="Provide a summary of the interview..." value={form.comments}
                                    onChange={e => setForm({ ...form, comments: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate(`/candidates/${candidateId}`)}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                        {submitting ? 'Submitting...' : `Submit & ${form.status === 'Passed' ? 'Advance' : 'Reject'} Candidate`}
                    </button>
                </div>
            </form>
        </div>
    );
}
