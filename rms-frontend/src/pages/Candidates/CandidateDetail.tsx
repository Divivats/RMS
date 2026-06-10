import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { candidatesApi, onboardingApi, BACKEND_URL } from '../../services/api';
import type { CandidateDetail as CandidateDetailType } from '../../types';
import { generateCandidatePdf } from '../../utils/generateCandidatePdf';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';

export default function CandidateDetail() {
    const { id } = useParams();
    const [candidate, setCandidate] = useState<CandidateDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEval, setShowEval] = useState<number | null>(null);
    const navigate = useNavigate();
    const { isAdmin, isConsultant, isProjectManager, isMD } = useAuth();
    const isViewOnly = isProjectManager || isMD;
    const canManageCandidates = isAdmin || isConsultant;

    // Photo lightbox
    const [photoOpen, setPhotoOpen] = useState(false);

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        fullName: '', email: '', phone: '', currentCompany: '', currentPosition: '',
        experienceYears: '' as string | number, skills: '', alphaCoderScore: '' as string | number, notes: '',
    });
    const [editPhoto, setEditPhoto] = useState<File | null>(null);
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    // Move to Onboarding modal
    const [onboardOpen, setOnboardOpen] = useState(false);
    const [onboardForm, setOnboardForm] = useState({
        type: 'Employee' as 'Employee' | 'Intern',
        ghrId: '', knoxId: '', projectLead: '', projectManager: '',
        dateOfJoining: new Date().toISOString().split('T')[0],
        department: '', designation: '', evaluationMonths: 6,
    });
    const [onboardError, setOnboardError] = useState('');
    const [onboarding, setOnboarding] = useState(false);

    // Resume upload & ATS pipeline phases
    const [atsPhase, setAtsPhase] = useState<'idle' | 'uploading' | 'extracting' | 'scoring' | 'done'>('idle');
    const [rescoring, setRescoring] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [atsError, setAtsError] = useState('');

    useEffect(() => { loadCandidate(); }, [id]);

    const loadCandidate = async () => {
        try {
            const { data } = await candidatesApi.getById(Number(id));
            setCandidate(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ── Resume Upload & ATS ──
    const handleResumeUpload = async () => {
        if (!candidate || !resumeFile) return;
        setAtsError('');
        setAtsPhase('uploading');
        // Simulate stepper — extracting phase after 1.5s (the backend does both)
        const extractTimer = setTimeout(() => setAtsPhase('extracting'), 1500);
        const scoreTimer = setTimeout(() => setAtsPhase('scoring'), 8000);
        try {
            await candidatesApi.uploadResume(candidate.id, resumeFile);
            setAtsPhase('done');
            setResumeFile(null);
            loadCandidate();
            setTimeout(() => setAtsPhase('idle'), 2000);
        } catch (err: any) {
            console.error(err);
            setAtsError(err?.response?.data?.message || 'Upload & scoring failed');
            setAtsPhase('idle');
        } finally {
            clearTimeout(extractTimer);
            clearTimeout(scoreTimer);
        }
    };

    const handleRescore = async () => {
        if (!candidate) return;
        setAtsError('');
        setRescoring(true);
        try {
            await candidatesApi.rescoreAts(candidate.id);
            loadCandidate();
        } catch (err: any) {
            console.error(err);
            setAtsError(err?.response?.data?.message || 'Re-scoring failed');
        }
        finally { setRescoring(false); }
    };

    const getAtsColor = (score?: number | null) => {
        if (score == null) return 'var(--text-muted)';
        if (score >= 70) return 'var(--success)';
        if (score >= 50) return 'var(--warning)';
        return 'var(--danger)';
    };

    const parseAtsDetails = () => {
        if (!candidate?.atsScoreDetails) return null;
        try { return JSON.parse(candidate.atsScoreDetails); }
        catch { return null; }
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

    // ── Edit Candidate ──
    const openEditModal = () => {
        if (!candidate) return;
        setEditForm({
            fullName: candidate.fullName,
            email: candidate.email,
            phone: candidate.phone || '',
            currentCompany: candidate.currentCompany || '',
            currentPosition: candidate.currentPosition || '',
            experienceYears: candidate.experienceYears || '',
            skills: candidate.skills || '',
            alphaCoderScore: candidate.alphaCoderScore || '',
            notes: candidate.notes || '',
        });
        setEditPhoto(null);
        setEditError('');
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!candidate) return;
        setEditError('');
        if (!editForm.fullName.trim() || !editForm.email.trim()) {
            setEditError('Full name and email are required.');
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('fullName', editForm.fullName);
            formData.append('email', editForm.email);
            formData.append('phone', editForm.phone as string);
            formData.append('currentCompany', editForm.currentCompany as string);
            formData.append('currentPosition', editForm.currentPosition as string);
            formData.append('skills', editForm.skills as string);
            formData.append('notes', editForm.notes as string);
            formData.append('jobPositionId', String(candidate.jobPositionId));
            if (editForm.experienceYears) formData.append('experienceYears', String(editForm.experienceYears));
            if (editForm.alphaCoderScore) formData.append('alphaCoderScore', String(editForm.alphaCoderScore));
            if (editPhoto) formData.append('photo', editPhoto);

            await candidatesApi.update(candidate.id, formData);
            setEditOpen(false);
            loadCandidate();
        } catch (err: any) {
            setEditError(err.response?.data?.message || 'Failed to save changes.');
        } finally { setSaving(false); }
    };

    // ── Move to Onboarding ──
    const openOnboardModal = () => {
        if (!candidate) return;
        setOnboardForm({
            ...onboardForm,
            department: candidate.department || '',
            designation: candidate.currentPosition || '',
        });
        setOnboardError('');
        setOnboardOpen(true);
    };

    const handleMoveToOnboarding = async () => {
        if (!candidate) return;
        setOnboardError('');
        if (!onboardForm.dateOfJoining) {
            setOnboardError('Date of joining is required.');
            return;
        }
        setOnboarding(true);
        try {
            await onboardingApi.move({
                candidateId: candidate.id,
                type: onboardForm.type,
                ghrId: onboardForm.ghrId || null,
                knoxId: onboardForm.knoxId || null,
                projectLead: onboardForm.projectLead || null,
                projectManager: onboardForm.projectManager || null,
                dateOfJoining: onboardForm.dateOfJoining,
                department: onboardForm.department || null,
                designation: onboardForm.designation || null,
                evaluationMonths: onboardForm.type === 'Employee' ? 6 : onboardForm.evaluationMonths,
            });
            setOnboardOpen(false);
            loadCandidate();
        } catch (err: any) {
            setOnboardError(err.response?.data?.message || 'Failed to move to onboarding.');
        } finally { setOnboarding(false); }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!candidate) return <div className="empty-state"><h3>Candidate not found</h3></div>;

    const nextPendingStep = candidate.interviews.find(i => i.status === 'Pending');
    const initials = candidate.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    const photoSrc = candidate.photoUrl ? `${BACKEND_URL}${candidate.photoUrl}` : null;

    return (
        <div>
            <div className="page-header">
                <h2>Candidate Profile</h2>
                <div className="page-header-actions">
                    {isAdmin && (
                        <button className="btn btn-secondary" onClick={openEditModal}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Candidate
                        </button>
                    )}
                    {canManageCandidates && candidate.status === 'Recruited' && (
                        <button className="btn btn-primary" onClick={openOnboardModal} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            Move to Onboarding
                        </button>
                    )}
                    {candidate.status === 'Onboarded' && (
                        <span className="badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '6px 14px', fontSize: '0.85rem' }}>✓ Onboarded</span>
                    )}
                    <button className="btn btn-primary" onClick={() => generateCandidatePdf(candidate)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Report
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
                </div>
            </div>

            {/* Profile Header */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-body">
                    <div className="profile-header">
                        <div
                            className="profile-photo"
                            style={{ cursor: photoSrc ? 'pointer' : 'default' }}
                            onClick={() => photoSrc && setPhotoOpen(true)}
                            title={photoSrc ? 'Click to enlarge photo' : ''}
                        >
                            {photoSrc ? (
                                <img src={photoSrc} alt={candidate.fullName} />
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
                                {candidate.atsScore != null && (
                                    <div className="profile-stat">
                                        <div className="profile-stat-value" style={{ color: getAtsColor(candidate.atsScore) }}>{candidate.atsScore}%</div>
                                        <div className="profile-stat-label">ATS Score</div>
                                    </div>
                                )}
                                {candidate.atsStatus === 'Unavailable' && (
                                    <div className="profile-stat">
                                        <div className="profile-stat-value" style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>⏳</div>
                                        <div className="profile-stat-label">AI Pending</div>
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

                        {nextPendingStep && candidate.status !== 'Rejected' && !isViewOnly && (
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

            {/* ATS Score & Resume Section */}
            <div style={{ display: 'grid', gridTemplateColumns: candidate.atsScore != null || candidate.atsStatus === 'Unavailable' ? '1fr 1fr' : '1fr', gap: 24, marginBottom: 24 }}>
                {/* Resume Upload / ATS Actions */}
                <div className="card">
                    <div className="card-header"><h3>📄 Resume & ATS Score</h3></div>
                    <div className="card-body">
                        {candidate.resumeUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <span>📎</span>
                                <a href={`${BACKEND_URL}${candidate.resumeUrl}`} target="_blank" rel="noreferrer" download={`${candidate.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_Resume${candidate.resumeUrl.substring(candidate.resumeUrl.lastIndexOf('.'))}`} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                                    Download Resume
                                </a>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    ({candidate.resumeUrl.substring(candidate.resumeUrl.lastIndexOf('.') + 1).toUpperCase()})
                                </span>
                            </div>
                        )}

                        {isAdmin && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', fontSize: '0.88rem' }}>
                                    {candidate.resumeUrl ? 'Replace Resume' : 'Upload Resume'} (PDF, DOCX, TXT)
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        className="form-input"
                                        type="file"
                                        accept=".pdf,.docx,.txt"
                                        onChange={e => setResumeFile(e.target.files?.[0] || null)}
                                        style={{ flex: 1 }}
                                        disabled={atsPhase !== 'idle'}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        disabled={!resumeFile || atsPhase !== 'idle'}
                                        onClick={handleResumeUpload}
                                    >
                                        Upload & Analyze
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ATS Pipeline Stepper Overlay */}
                        {atsPhase !== 'idle' && atsPhase !== 'done' && (
                            <div style={{
                                padding: 20, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)', marginBottom: 16,
                            }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ATS Pipeline Progress
                                </div>
                                {[
                                    { key: 'uploading', label: '📤 Uploading resume...', icon: '📤' },
                                    { key: 'extracting', label: '📄 Extracting text via THOR AI...', icon: '📄' },
                                    { key: 'scoring', label: '🔍 Analyzing with SEMCAT AI...', icon: '🔍' },
                                ].map((step, i) => {
                                    const phases = ['uploading', 'extracting', 'scoring'];
                                    const currentIdx = phases.indexOf(atsPhase);
                                    const stepIdx = phases.indexOf(step.key);
                                    const isActive = stepIdx === currentIdx;
                                    const isDone = stepIdx < currentIdx;
                                    return (
                                        <div key={step.key} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                                            background: isActive ? 'var(--accent-bg)' : 'transparent',
                                            opacity: isDone ? 0.5 : stepIdx > currentIdx ? 0.35 : 1,
                                            transition: 'all 0.3s ease',
                                        }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                                                fontWeight: 700, flexShrink: 0,
                                                background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)',
                                                color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                                            }}>
                                                {isDone ? '✓' : i + 1}
                                            </div>
                                            <span style={{
                                                fontSize: '0.88rem', fontWeight: isActive ? 700 : 500,
                                                color: isActive ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--text-muted)',
                                            }}>
                                                {isDone ? step.label.replace('...', ' ✓') : step.label}
                                            </span>
                                            {isActive && (
                                                <div style={{
                                                    width: 16, height: 16, border: '2px solid var(--accent)',
                                                    borderTopColor: 'transparent', borderRadius: '50%',
                                                    animation: 'spin 0.8s linear infinite', marginLeft: 'auto',
                                                }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {atsPhase === 'done' && (
                            <div style={{
                                padding: 16, background: 'var(--success-bg, rgba(16,185,129,0.1))',
                                borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.3)',
                                marginBottom: 16, textAlign: 'center',
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>✅</span>
                                <span style={{ fontWeight: 700, color: 'var(--success)', marginLeft: 8 }}>ATS Analysis Complete!</span>
                            </div>
                        )}

                        {atsError && (
                            <div style={{
                                padding: 12, background: 'var(--danger-bg, rgba(239,68,68,0.1))',
                                borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)',
                                marginBottom: 16, fontSize: '0.85rem', color: 'var(--danger)',
                            }}>
                                ⚠️ {atsError}
                            </div>
                        )}

                        {/* Re-score button */}
                        {isAdmin && candidate.atsStatus && candidate.atsStatus !== 'NoResume' && (
                            <button
                                className="btn btn-secondary btn-full"
                                onClick={handleRescore}
                                disabled={rescoring || atsPhase !== 'idle'}
                                style={{ marginTop: 8 }}
                            >
                                {rescoring ? '🔄 Re-scoring...' : '🔄 Re-score ATS (refresh AI analysis)'}
                            </button>
                        )}

                        {/* Status messages */}
                        {candidate.atsStatus === 'Unavailable' && (
                            <div style={{ marginTop: 16, padding: 16, background: 'var(--warning-bg, rgba(245,158,11,0.1))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 4 }}>⚠️ AI Model Unavailable</div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    SEMCAT AI (SEM_GO120) is currently offline. Deterministic score: <strong>{candidate.atsDeterministicScore}%</strong>.
                                    Hit "Re-score" when the AI is back online to get the full combined score.
                                </p>
                            </div>
                        )}
                        {candidate.atsStatus === 'NoResume' && (
                            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                No resume uploaded yet. Upload one to get the ATS score.
                            </div>
                        )}
                    </div>
                </div>

                {/* ATS Score Breakdown */}
                {(candidate.atsScore != null || candidate.atsStatus === 'Unavailable') && (() => {
                    const details = parseAtsDetails();
                    return (
                        <div className="card">
                            <div className="card-header"><h3>🎯 ATS Score Breakdown</h3></div>
                            <div className="card-body">
                                {/* Score gauge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: `conic-gradient(${getAtsColor(candidate.atsScore)} ${(candidate.atsScore || 0) * 3.6}deg, var(--bg-primary) 0deg)`,
                                        fontSize: '1.1rem', fontWeight: 800, color: getAtsColor(candidate.atsScore),
                                        position: 'relative',
                                    }}>
                                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {candidate.atsScore != null ? `${candidate.atsScore}%` : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Deterministic: <strong>{candidate.atsDeterministicScore ?? '—'}%</strong></div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>AI Semantic: <strong>{candidate.atsAiScore ?? 'Unavailable'}%</strong></div>
                                    </div>
                                </div>

                                {/* Category bars */}
                                {details?.deterministicBreakdown && (
                                    <div style={{ marginBottom: 16 }}>
                                        {[
                                            { label: 'Skills Match', value: details.deterministicBreakdown.skillsMatch },
                                            { label: 'Experience', value: details.deterministicBreakdown.experienceMatch },
                                            { label: 'Education', value: details.deterministicBreakdown.educationMatch },
                                            { label: 'Keywords', value: details.deterministicBreakdown.keywordDensity },
                                        ].map(item => (
                                            <div key={item.label} style={{ marginBottom: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
                                                    <span>{item.label}</span><span style={{ fontWeight: 600 }}>{Math.round(item.value)}%</span>
                                                </div>
                                                <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${Math.min(100, item.value)}%`, background: getAtsColor(item.value), borderRadius: 3, transition: 'width 0.6s ease' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Keywords */}
                                {details?.matchedKeywords?.length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Matched Keywords</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {details.matchedKeywords.slice(0, 15).map((kw: string) => (
                                                <span key={kw} style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: 'var(--success-bg, rgba(16,185,129,0.1))', color: 'var(--success)' }}>{kw}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {details?.missingKeywords?.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Missing Keywords</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {details.missingKeywords.slice(0, 15).map((kw: string) => (
                                                <span key={kw} style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: 'var(--danger-bg, rgba(239,68,68,0.1))', color: 'var(--danger)' }}>{kw}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* AI Insights (when available) */}
            {(() => {
                const details = parseAtsDetails();
                if (!details?.aiAnalysis) return null;
                const ai = details.aiAnalysis;
                return (
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header"><h3>🤖 AI Analysis — SEM_GO120</h3></div>
                        <div className="card-body">
                            {/* Role Fit Summary */}
                            {ai.roleFitSummary && (
                                <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', marginBottom: 16, fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                    "{ai.roleFitSummary}"
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {/* Strengths */}
                                {ai.strengths?.length > 0 && (
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 8, fontSize: '0.85rem' }}>✅ Strengths</div>
                                        {ai.strengths.map((s: string, i: number) => (
                                            <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 12, borderLeft: '2px solid var(--success)' }}>{s}</div>
                                        ))}
                                    </div>
                                )}
                                {/* Weaknesses */}
                                {ai.weaknesses?.length > 0 && (
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 8, fontSize: '0.85rem' }}>⚠️ Weaknesses</div>
                                        {ai.weaknesses.map((w: string, i: number) => (
                                            <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 12, borderLeft: '2px solid var(--warning)' }}>{w}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Missing Skills */}
                            {ai.missingSkills?.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 8, fontSize: '0.85rem' }}>🚫 Missing Skills</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {ai.missingSkills.map((s: string) => (
                                            <span key={s} style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600, background: 'var(--danger-bg, rgba(239,68,68,0.1))', color: 'var(--danger)' }}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Improvement Suggestions */}
                            {ai.improvementSuggestions?.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 8, fontSize: '0.85rem' }}>💡 Improvement Suggestions</div>
                                    {ai.improvementSuggestions.map((s: string, i: number) => (
                                        <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>{s}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

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
                                                {interview.status === 'Pending' && isCurrent && candidate.status !== 'Rejected' && !isViewOnly && (
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

            {/* ── Photo Lightbox ── */}
            {photoOpen && photoSrc && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', animation: 'fadeIn 0.2s ease',
                    }}
                    onClick={() => setPhotoOpen(false)}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                        <img
                            src={photoSrc}
                            alt={candidate.fullName}
                            style={{
                                maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)', objectFit: 'contain',
                                animation: 'scaleIn 0.25s ease',
                            }}
                        />
                        <div style={{
                            position: 'absolute', bottom: -40, left: 0, right: 0,
                            textAlign: 'center', color: '#fff', fontSize: '0.95rem', fontWeight: 600,
                        }}>
                            {candidate.fullName}
                        </div>
                        <button
                            onClick={() => setPhotoOpen(false)}
                            style={{
                                position: 'absolute', top: -12, right: -12,
                                width: 36, height: 36, borderRadius: '50%',
                                background: '#fff', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', fontWeight: 700, color: '#333',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}
                        >✕</button>
                    </div>
                </div>
            )}

            {/* ── Edit Candidate Modal ── */}
            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Candidate" width={560}>
                <div>
                    {editError && <div className="login-error" style={{ marginBottom: 16 }}>{editError}</div>}
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input className="form-input" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Email *</label>
                            <input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input className="form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Current Company</label>
                            <input className="form-input" value={editForm.currentCompany} onChange={e => setEditForm({ ...editForm, currentCompany: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Current Position</label>
                            <input className="form-input" value={editForm.currentPosition} onChange={e => setEditForm({ ...editForm, currentPosition: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Experience (years)</label>
                            <input className="form-input" type="number" step="0.5" value={editForm.experienceYears} onChange={e => setEditForm({ ...editForm, experienceYears: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>AlphaCoder Score (%)</label>
                            <input className="form-input" type="number" min="0" max="100" value={editForm.alphaCoderScore} onChange={e => setEditForm({ ...editForm, alphaCoderScore: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Update Photo</label>
                            <input className="form-input" type="file" accept="image/*" onChange={e => setEditPhoto(e.target.files?.[0] || null)} />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: 8 }}>
                        <label>Skills</label>
                        <textarea className="form-textarea" rows={2} value={editForm.skills} onChange={e => setEditForm({ ...editForm, skills: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <textarea className="form-textarea" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button className="btn btn-secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Move to Onboarding Modal ── */}
            <Modal isOpen={onboardOpen} onClose={() => setOnboardOpen(false)} title="Move to Onboarding" width={600}>
                <div>
                    {onboardError && <div className="login-error" style={{ marginBottom: 16 }}>{onboardError}</div>}

                    {/* Candidate summary */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                        <div className="profile-photo" style={{ width: 48, height: 48, fontSize: '1rem' }}>
                            {photoSrc ? <img src={photoSrc} alt="" /> : initials}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>{candidate.fullName}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{candidate.email} • {candidate.jobTitle}</div>
                        </div>
                    </div>

                    {/* Type Selection */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Onboarding Type *</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {(['Employee', 'Intern'] as const).map(t => (
                                <label key={t} style={{
                                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '14px 16px', borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${onboardForm.type === t ? 'var(--accent)' : 'var(--border)'}`,
                                    background: onboardForm.type === t ? 'var(--accent-bg)' : 'transparent',
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                }}>
                                    <input type="radio" name="ob-type" checked={onboardForm.type === t} onChange={() => setOnboardForm({ ...onboardForm, type: t })} style={{ accentColor: 'var(--accent)' }} />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{t}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            {t === 'Employee' ? '6 months probation' : 'Variable evaluation period'}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>GHR ID</label>
                            <input className="form-input" value={onboardForm.ghrId} onChange={e => setOnboardForm({ ...onboardForm, ghrId: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Knox ID</label>
                            <input className="form-input" value={onboardForm.knoxId} onChange={e => setOnboardForm({ ...onboardForm, knoxId: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Project Lead</label>
                            <input className="form-input" value={onboardForm.projectLead} onChange={e => setOnboardForm({ ...onboardForm, projectLead: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Project Manager</label>
                            <input className="form-input" value={onboardForm.projectManager} onChange={e => setOnboardForm({ ...onboardForm, projectManager: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Date of Joining *</label>
                            <input className="form-input" type="date" value={onboardForm.dateOfJoining} onChange={e => setOnboardForm({ ...onboardForm, dateOfJoining: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Department</label>
                            <input className="form-input" value={onboardForm.department} onChange={e => setOnboardForm({ ...onboardForm, department: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Designation</label>
                            <input className="form-input" value={onboardForm.designation} onChange={e => setOnboardForm({ ...onboardForm, designation: e.target.value })} />
                        </div>
                        {onboardForm.type === 'Intern' && (
                            <div className="form-group">
                                <label>Evaluation Period (months)</label>
                                <input className="form-input" type="number" min="1" max="24" value={onboardForm.evaluationMonths} onChange={e => setOnboardForm({ ...onboardForm, evaluationMonths: Number(e.target.value) })} />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button className="btn btn-secondary" onClick={() => setOnboardOpen(false)} disabled={onboarding}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleMoveToOnboarding} disabled={onboarding}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            {onboarding ? 'Moving...' : 'Confirm & Move to Onboarding'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
