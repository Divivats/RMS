import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { candidatesApi, jobsApi } from '../../services/api';
import type { JobPosition } from '../../types';

export default function CreateCandidate() {
    const navigate = useNavigate();
    const location = useLocation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [jobs, setJobs] = useState<JobPosition[]>([]);
    const [preview, setPreview] = useState<string>('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null);

    const defaultJobId = (location.state as any)?.jobId || '';

    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', currentCompany: '', currentPosition: '',
        experienceYears: '', skills: '', alphaCoderScore: '', notes: '', jobPositionId: defaultJobId,
        // Education
        education10thSchool: '', education10thPercentage: '',
        education12thSchool: '', education12thPercentage: '',
        educationCollegeName: '', educationCollegeDegree: '', educationCollegeCGPA: '',
    });

    useEffect(() => {
        jobsApi.getAll({ status: 'Open' }).then(({ data }) => setJobs(data));
    }, []);

    const updateForm = (key: string, value: any) => setForm({ ...form, [key]: value });

    const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.jobPositionId) { setError('Please select a job position'); return; }
        setError('');
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('fullName', form.fullName);
            fd.append('email', form.email);
            fd.append('phone', form.phone);
            fd.append('currentCompany', form.currentCompany);
            fd.append('currentPosition', form.currentPosition);
            if (form.experienceYears) fd.append('experienceYears', form.experienceYears);
            fd.append('skills', form.skills);
            if (form.alphaCoderScore) fd.append('alphaCoderScore', form.alphaCoderScore);
            fd.append('notes', form.notes);
            fd.append('jobPositionId', form.jobPositionId.toString());
            if (photo) fd.append('photo', photo);
            // Education
            if (form.education10thSchool) fd.append('education10thSchool', form.education10thSchool);
            if (form.education10thPercentage) fd.append('education10thPercentage', form.education10thPercentage);
            if (form.education12thSchool) fd.append('education12thSchool', form.education12thSchool);
            if (form.education12thPercentage) fd.append('education12thPercentage', form.education12thPercentage);
            if (form.educationCollegeName) fd.append('educationCollegeName', form.educationCollegeName);
            if (form.educationCollegeDegree) fd.append('educationCollegeDegree', form.educationCollegeDegree);
            if (form.educationCollegeCGPA) fd.append('educationCollegeCGPA', form.educationCollegeCGPA);
            if (resumeFile) fd.append('resume', resumeFile);

            const { data } = await candidatesApi.create(fd);
            navigate(`/candidates/${data.id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create candidate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2>Add New Candidate</h2>
                <button className="btn btn-secondary" onClick={() => navigate('/candidates')}>← Back</button>
            </div>

            <form onSubmit={handleSubmit}>
                {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 24, marginBottom: 24 }}>
                    <div className="card">
                        <div className="card-header"><h3>Personal Information</h3></div>
                        <div className="card-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input className="form-input" value={form.fullName} onChange={e => updateForm('fullName', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Experience (Years)</label>
                                    <input className="form-input" type="number" step="0.5" min="0" value={form.experienceYears} onChange={e => updateForm('experienceYears', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Current Company</label>
                                    <input className="form-input" value={form.currentCompany} onChange={e => updateForm('currentCompany', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Current Position</label>
                                    <input className="form-input" value={form.currentPosition} onChange={e => updateForm('currentPosition', e.target.value)} />
                                </div>
                                <div className="form-group full-width">
                                    <label>Skills</label>
                                    <input className="form-input" placeholder="e.g., React, Node.js, Python" value={form.skills} onChange={e => updateForm('skills', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ height: 'fit-content' }}>
                        <div className="card-header"><h3>Photo</h3></div>
                        <div className="card-body">
                            <div className="photo-upload">
                                <div className="photo-preview" onClick={() => fileRef.current?.click()}>
                                    {preview ? <img src={preview} alt="preview" /> : <div className="photo-preview-placeholder">Click to upload</div>}
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>Upload Photo</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Education Section */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Education Qualification</h3></div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                            {/* 10th */}
                            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>10th Standard</div>
                                <div className="form-group">
                                    <label>School Name</label>
                                    <input className="form-input" value={form.education10thSchool} onChange={e => updateForm('education10thSchool', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Percentage (%)</label>
                                    <input className="form-input" type="number" step="0.01" min="0" max="100" value={form.education10thPercentage} onChange={e => updateForm('education10thPercentage', e.target.value)} />
                                </div>
                            </div>
                            {/* 12th */}
                            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>12th Standard</div>
                                <div className="form-group">
                                    <label>School Name</label>
                                    <input className="form-input" value={form.education12thSchool} onChange={e => updateForm('education12thSchool', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Percentage (%)</label>
                                    <input className="form-input" type="number" step="0.01" min="0" max="100" value={form.education12thPercentage} onChange={e => updateForm('education12thPercentage', e.target.value)} />
                                </div>
                            </div>
                            {/* College */}
                            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>College / University</div>
                                <div className="form-group">
                                    <label>College Name</label>
                                    <input className="form-input" value={form.educationCollegeName} onChange={e => updateForm('educationCollegeName', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Degree</label>
                                    <input className="form-input" placeholder="e.g., B.Tech CSE" value={form.educationCollegeDegree} onChange={e => updateForm('educationCollegeDegree', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>CGPA</label>
                                    <input className="form-input" type="number" step="0.01" min="0" max="10" value={form.educationCollegeCGPA} onChange={e => updateForm('educationCollegeCGPA', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resume Upload */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Resume Upload</h3></div>
                    <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Upload Resume (PDF, DOCX, or TXT)</label>
                                <input
                                    className="form-input"
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    onChange={e => setResumeFile(e.target.files?.[0] || null)}
                                />
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                    The resume will be parsed and scored against the job description using AI-powered ATS analysis.
                                </p>
                            </div>
                            {resumeFile && (
                                <div style={{ padding: '12px 16px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--success-text)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    📄 {resumeFile.name} ({(resumeFile.size / 1024).toFixed(0)} KB)
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Recruitment Details</h3></div>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Job Position *</label>
                                <select className="form-select" value={form.jobPositionId} onChange={e => updateForm('jobPositionId', e.target.value)} required>
                                    <option value="">Select a position</option>
                                    {jobs.map(j => <option key={j.id} value={j.id}>{j.jobId} — {j.title}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>AlphaCoder Score (%)</label>
                                <input className="form-input" type="number" min="0" max="100" step="0.1" placeholder="e.g., 85.5" value={form.alphaCoderScore} onChange={e => updateForm('alphaCoderScore', e.target.value)} />
                            </div>
                            <div className="form-group full-width">
                                <label>Notes</label>
                                <textarea className="form-textarea" placeholder="Additional notes about the candidate..." value={form.notes} onChange={e => updateForm('notes', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/candidates')}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>{loading ? 'Creating...' : 'Add Candidate'}</button>
                </div>
            </form>
        </div>
    );
}
