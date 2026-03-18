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

    const defaultJobId = (location.state as any)?.jobId || '';

    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', currentCompany: '', currentPosition: '',
        experienceYears: '', skills: '', alphaCoderScore: '', notes: '', jobPositionId: defaultJobId,
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
