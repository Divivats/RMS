import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onboardingApi, BACKEND_URL } from '../../services/api';
import type { OnboardingDetail as OnboardingDetailType, Milestone } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';

export default function OnboardingDetail() {
    const { id } = useParams();
    const [record, setRecord] = useState<OnboardingDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const fileRef = useRef<HTMLInputElement>(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ ghrId: '', knoxId: '', projectLead: '', projectManager: '', department: '', designation: '' });
    const [saving, setSaving] = useState(false);
    const [ratingOpen, setRatingOpen] = useState(false);
    const [ratingMilestone, setRatingMilestone] = useState<Milestone | null>(null);
    const [perfRating, setPerfRating] = useState(3);
    const [perfRemarks, setPerfRemarks] = useState('');
    const [savingRating, setSavingRating] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<{ milestoneId: number; docType: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [photoOpen, setPhotoOpen] = useState(false);
    const [promoting, setPromoting] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [completing, setCompleting] = useState(false);

    useEffect(() => { loadRecord(); }, [id]);

    const loadRecord = async () => {
        try { const { data } = await onboardingApi.getById(Number(id)); setRecord(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openEdit = () => {
        if (!record) return;
        setEditForm({ ghrId: record.ghrId || '', knoxId: record.knoxId || '', projectLead: record.projectLead || '', projectManager: record.projectManager || '', department: record.department || '', designation: record.designation || '' });
        setEditOpen(true);
    };
    const handleEditSave = async () => {
        if (!record) return; setSaving(true);
        try { await onboardingApi.update(record.id, editForm); setEditOpen(false); loadRecord(); }
        catch { alert('Failed to save.'); } finally { setSaving(false); }
    };

    const triggerUpload = (milestoneId: number, docType: string) => {
        setUploadTarget({ milestoneId, docType });
        setTimeout(() => fileRef.current?.click(), 100);
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return; setUploading(true);
        try { await onboardingApi.uploadMilestoneDoc(uploadTarget.milestoneId, uploadTarget.docType, file); loadRecord(); }
        catch (err: any) { alert(err.response?.data?.message || 'Upload failed'); }
        finally { setUploading(false); setUploadTarget(null); e.target.value = ''; }
    };

    const openRatingModal = (milestone: Milestone) => {
        setRatingMilestone(milestone); setPerfRating(milestone.performanceRating || 3); setPerfRemarks(milestone.performanceRemarks || ''); setRatingOpen(true);
    };
    const handleRatingSave = async () => {
        if (!ratingMilestone) return; setSavingRating(true);
        try { await onboardingApi.updateMilestone(ratingMilestone.id, { performanceRating: perfRating, performanceRemarks: perfRemarks }); setRatingOpen(false); loadRecord(); }
        catch (err: any) { alert(err.response?.data?.message || 'Failed to save rating'); } finally { setSavingRating(false); }
    };

    const handlePromote = async () => {
        if (!record) return; setPromoting(true);
        try { const { data } = await onboardingApi.promote(record.id); navigate(`/onboarding/${data.id}`); }
        catch (err: any) { alert(err.response?.data?.message || 'Failed to promote'); } finally { setPromoting(false); }
    };

    const handleComplete = async (accepted: boolean) => {
        if (!record) return; setCompleting(true);
        try { await onboardingApi.complete(record.id, accepted); setCompleteOpen(false); loadRecord(); }
        catch (err: any) { alert(err.response?.data?.message || 'Failed'); } finally { setCompleting(false); }
    };

    const downloadProfile = () => {
        if (!record) return;
        const w = window.open('', '_blank');
        if (!w) return;
        const avgRating = record.milestones.filter(m => m.performanceRating).reduce((s, m) => s + (m.performanceRating || 0), 0) / (record.milestones.filter(m => m.performanceRating).length || 1);
        w.document.write(`<html><head><title>${record.fullName} — Onboarding Profile</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#222}h1{color:#1a56db;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f5f5}h2{margin-top:24px;color:#333;border-bottom:2px solid #1a56db;padding-bottom:4px}.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600}</style></head><body>`);
        w.document.write(`<h1>${record.fullName}</h1><p style="color:#666">${record.type} — ${record.status} | GHR: ${record.ghrId || '—'} | Knox: ${record.knoxId || '—'}</p>`);
        w.document.write(`<h2>Details</h2><table><tr><th>Department</th><td>${record.department || '—'}</td><th>Designation</th><td>${record.designation || '—'}</td></tr><tr><th>Date of Joining</th><td>${new Date(record.dateOfJoining).toLocaleDateString('en-IN')}</td><th>Evaluation</th><td>${record.evaluationMonths} months</td></tr><tr><th>Project Lead</th><td>${record.projectLead || '—'}</td><th>Project Manager</th><td>${record.projectManager || '—'}</td></tr><tr><th>Skills</th><td>${record.skills || '—'}</td><th>Experience</th><td>${record.experienceYears ? record.experienceYears + ' yrs' : '—'}</td></tr></table>`);
        w.document.write(`<h2>Education</h2><table><tr><th></th><th>Institution</th><th>Score</th></tr><tr><td>10th</td><td>${record.education10thSchool || '—'}</td><td>${record.education10thPercentage ? record.education10thPercentage + '%' : '—'}</td></tr><tr><td>12th</td><td>${record.education12thSchool || '—'}</td><td>${record.education12thPercentage ? record.education12thPercentage + '%' : '—'}</td></tr><tr><td>College</td><td>${record.educationCollegeName || '—'} ${record.educationCollegeDegree ? '(' + record.educationCollegeDegree + ')' : ''}</td><td>${record.educationCollegeCGPA ? record.educationCollegeCGPA + ' CGPA' : '—'}</td></tr></table>`);
        w.document.write(`<h2>Milestones (${record.completedMilestones}/${record.evaluationMonths})</h2><table><tr><th>Month</th><th>Buddy</th><th>1:1</th><th>Mid-Term</th><th>Rating</th><th>Status</th></tr>`);
        record.milestones.forEach(m => {
            w.document.write(`<tr><td>${m.monthNumber}</td><td>${m.buddyReportUrl ? '✅' : '—'}</td><td>${m.oneToOneReportUrl ? '✅' : '—'}</td><td>${m.isMidTermMonth ? (m.midTermReportUrl ? '✅' : '—') : 'N/A'}</td><td>${m.performanceRating ? m.performanceRating + '/5' : '—'}</td><td>${m.status}</td></tr>`);
        });
        w.document.write(`</table><p style="margin-top:16px"><strong>Avg Rating:</strong> ${avgRating.toFixed(1)}/5</p>`);
        w.document.write(`</body></html>`); w.document.close(); w.print();
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!record) return <div className="empty-state"><h3>Record not found</h3></div>;

    const photoSrc = record.photoUrl ? `${BACKEND_URL}${record.photoUrl}` : null;
    const initials = record.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    const allDone = record.milestones.length > 0 && record.milestones.every(m => m.status === 'Completed');
    const isInternDone = record.type === 'Intern' && allDone && record.status === 'Active';
    const isEmpDone = record.type === 'Employee' && allDone && record.status === 'Active';

    return (
        <div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />

            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span className="badge" style={{ background: record.type === 'Employee' ? 'var(--accent-bg)' : 'var(--warning-bg)', color: record.type === 'Employee' ? 'var(--accent)' : 'var(--warning)' }}>{record.type}</span>
                        <span className={`badge ${record.status === 'Active' ? 'badge-progress' : record.status === 'Completed' ? 'badge-recruited' : 'badge-rejected'}`}>{record.status}</span>
                    </div>
                    <h2>{record.fullName}</h2>
                </div>
                <div className="page-header-actions">
                    {isAdmin && <button className="btn btn-secondary" onClick={openEdit}>✏️ Edit</button>}
                    <button className="btn btn-secondary" onClick={downloadProfile}>📥 Download Profile</button>
                    {isInternDone && (
                        <button className="btn btn-primary" onClick={handlePromote} disabled={promoting} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            {promoting ? 'Promoting...' : '🚀 Move to Employee Probation'}
                        </button>
                    )}
                    {isEmpDone && (
                        <button className="btn btn-primary" onClick={() => setCompleteOpen(true)} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            ✅ Complete Probation
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => navigate('/onboarding')}>← Back</button>
                </div>
            </div>

            {/* Profile & Education */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header"><h3>Profile</h3></div>
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                            <div className="profile-photo" style={{ width: 64, height: 64, fontSize: '1.4rem', cursor: photoSrc ? 'pointer' : 'default' }} onClick={() => photoSrc && setPhotoOpen(true)} title={photoSrc ? 'Click to enlarge' : ''}>
                                {photoSrc ? <img src={photoSrc} alt="" /> : initials}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{record.fullName}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{record.email}</div>
                                {record.phone && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📱 {record.phone}</div>}
                            </div>
                        </div>
                        <div className="detail-grid">
                            {[['GHR ID', record.ghrId], ['Knox ID', record.knoxId], ['Department', record.department], ['Designation', record.designation], ['Project Lead', record.projectLead], ['Project Manager', record.projectManager], ['Date of Joining', new Date(record.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })], ['Evaluation', record.evaluationMonths + ' months']].map(([l, v]) => (
                                <div className="detail-item" key={l as string}><div className="detail-label">{l}</div><div className="detail-value">{(v as string) || '—'}</div></div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3>Education</h3></div>
                    <div className="card-body">
                        {[{ t: '10th Standard', s: record.education10thSchool, sc: record.education10thPercentage, u: '%' },
                          { t: '12th Standard', s: record.education12thSchool, sc: record.education12thPercentage, u: '%' },
                          { t: 'College', s: record.educationCollegeName, sc: record.educationCollegeCGPA, u: ' CGPA', e: record.educationCollegeDegree }
                        ].map((edu, i) => (
                            <div key={i} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', marginBottom: i < 2 ? 12 : 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>{edu.t}</div>
                                <div style={{ fontWeight: 600 }}>{edu.s || '—'}</div>
                                {edu.e && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{edu.e}</div>}
                                {edu.sc && <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>{edu.sc}{edu.u}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Milestones */}
            <div className="card">
                <div className="card-header">
                    <h3>Probation Milestones</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{record.completedMilestones}/{record.evaluationMonths} completed</span>
                </div>
                <div className="card-body">
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overall Progress</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{record.evaluationMonths > 0 ? Math.round((record.completedMilestones / record.evaluationMonths) * 100) : 0}%</span>
                        </div>
                        <div style={{ height: 10, background: 'var(--bg-primary)', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 5, transition: 'width 0.8s ease', background: record.status === 'Completed' ? 'var(--success)' : 'var(--accent)', width: `${record.evaluationMonths > 0 ? (record.completedMilestones / record.evaluationMonths) * 100 : 0}%` }} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 16 }}>
                        {record.milestones.map(m => (
                            <div key={m.id} style={{ padding: 20, borderRadius: 'var(--radius-md)', border: `2px solid ${m.status === 'Completed' ? 'var(--success)' : m.isUnlocked ? 'var(--accent)' : 'var(--border-light)'}`, background: m.status === 'Completed' ? 'var(--success-bg)' : m.isUnlocked ? 'var(--bg-secondary)' : 'var(--bg-primary)', opacity: m.isUnlocked ? 1 : 0.6, transition: 'all 0.3s ease' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', background: m.status === 'Completed' ? 'var(--success)' : m.isUnlocked ? 'var(--accent)' : 'var(--border)', color: '#fff' }}>
                                            {m.status === 'Completed' ? '✓' : m.monthNumber}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>Month {m.monthNumber}{m.isMidTermMonth && <span style={{ marginLeft: 8, fontSize: '0.75rem', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 12 }}>Mid-Term</span>}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.isUnlocked ? (m.status === 'Completed' ? 'Completed' : 'Available now') : `Unlocks ${new Date(m.unlocksAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}</div>
                                        </div>
                                    </div>
                                    <span className={`badge ${m.status === 'Completed' ? 'badge-recruited' : m.isUnlocked ? 'badge-progress' : 'badge-pending'}`}>{m.status === 'Completed' ? '✅ Done' : m.isUnlocked ? '⏳ Pending' : '🔒 Locked'}</span>
                                </div>
                                {m.isUnlocked && (
                                    <div style={{ display: 'grid', gridTemplateColumns: m.isMidTermMonth ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
                                        <DocSlot label="Buddy Report" url={m.buddyReportUrl} onUpload={() => triggerUpload(m.id, 'buddy')} uploading={uploading && uploadTarget?.milestoneId === m.id && uploadTarget?.docType === 'buddy'} completed={m.status === 'Completed'} />
                                        <DocSlot label="One-to-One Report" url={m.oneToOneReportUrl} onUpload={() => triggerUpload(m.id, 'onetoone')} uploading={uploading && uploadTarget?.milestoneId === m.id && uploadTarget?.docType === 'onetoone'} completed={m.status === 'Completed'} />
                                        {m.isMidTermMonth && <DocSlot label="Mid-Term Report" url={m.midTermReportUrl} onUpload={() => triggerUpload(m.id, 'midterm')} uploading={uploading && uploadTarget?.milestoneId === m.id && uploadTarget?.docType === 'midterm'} completed={m.status === 'Completed'} />}
                                        <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Performance</div>
                                            {m.performanceRating ? (
                                                <div>
                                                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: m.performanceRating >= 4 ? 'var(--success)' : m.performanceRating >= 3 ? 'var(--warning)' : 'var(--danger)' }}>{m.performanceRating}/5</div>
                                                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => openRatingModal(m)}>Edit</button>
                                                </div>
                                            ) : <button className="btn btn-primary btn-sm" onClick={() => openRatingModal(m)}>Rate</button>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Photo Lightbox */}
            <Modal isOpen={photoOpen} onClose={() => setPhotoOpen(false)} title="Profile Photo" width={500}>
                <div style={{ textAlign: 'center' }}>
                    {photoSrc && <img src={photoSrc} alt={record.fullName} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-md)' }} />}
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Onboarding Details" width={500}>
                <div>
                    <div className="form-grid">
                        {Object.entries({ ghrId: 'GHR ID', knoxId: 'Knox ID', projectLead: 'Project Lead', projectManager: 'Project Manager', department: 'Department', designation: 'Designation' }).map(([k, l]) => (
                            <div className="form-group" key={k}><label>{l}</label><input className="form-input" value={(editForm as any)[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} /></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button className="btn btn-secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </div>
            </Modal>

            {/* Rating Modal */}
            <Modal isOpen={ratingOpen} onClose={() => setRatingOpen(false)} title={`Month ${ratingMilestone?.monthNumber} — Performance`} width={400}>
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Rating (1-5)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[1, 2, 3, 4, 5].map(r => (
                                <button key={r} onClick={() => setPerfRating(r)} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, transition: 'all 0.2s ease', background: perfRating === r ? (r >= 4 ? 'var(--success)' : r >= 3 ? 'var(--warning)' : 'var(--danger)') : 'var(--bg-primary)', color: perfRating === r ? '#fff' : 'var(--text-primary)', transform: perfRating === r ? 'scale(1.15)' : 'scale(1)' }}>{r}</button>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Remarks (optional)</label>
                        <textarea className="form-textarea" rows={3} value={perfRemarks} onChange={e => setPerfRemarks(e.target.value)} placeholder="Performance notes..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button className="btn btn-secondary" onClick={() => setRatingOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleRatingSave} disabled={savingRating}>{savingRating ? 'Saving...' : 'Save Rating'}</button>
                    </div>
                </div>
            </Modal>

            {/* Complete Probation Modal */}
            <Modal isOpen={completeOpen} onClose={() => setCompleteOpen(false)} title="Complete Probation" width={420}>
                <div>
                    <p style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>All milestones are completed. Would you like to <strong>accept</strong> or <strong>reject</strong> this employee's probation?</p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setCompleteOpen(false)} disabled={completing}>Cancel</button>
                        <button className="btn" onClick={() => handleComplete(false)} disabled={completing} style={{ background: 'var(--danger)', color: '#fff' }}>❌ Reject</button>
                        <button className="btn btn-primary" onClick={() => handleComplete(true)} disabled={completing} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>{completing ? '...' : '✅ Accept'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function DocSlot({ label, url, onUpload, uploading, completed }: { label: string; url?: string | null; onUpload: () => void; uploading: boolean; completed?: boolean }) {
    return (
        <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
            {url ? (
                <div>
                    <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>✅ Uploaded</span>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                        <a href={`${BACKEND_URL}${url}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>View</a>
                        <a href={`${BACKEND_URL}${url}`} download className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>⬇ Download</a>
                        {!completed && <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={onUpload}>Replace</button>}
                    </div>
                </div>
            ) : (
                <button className="btn btn-primary btn-sm" onClick={onUpload} disabled={uploading}>{uploading ? '...' : 'Upload PDF'}</button>
            )}
        </div>
    );
}
