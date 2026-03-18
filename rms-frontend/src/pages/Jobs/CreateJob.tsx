import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../../services/api';

export default function CreateJob() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState<{
        jobId: string; title: string; department: string; location: string; managerName: string;
        numberOfPositions: number; interviewStepCount: string | number; description: string; requirements: string;
        salaryRangeMin: string; salaryRangeMax: string;
    }>({
        jobId: '', title: '', department: '', location: '', managerName: '',
        numberOfPositions: 1, interviewStepCount: 3, description: '', requirements: '',
        salaryRangeMin: '', salaryRangeMax: '',
    });
    const [steps, setSteps] = useState([
        { stepNumber: 1, stepName: 'Technical Screening', description: 'Initial technical assessment' },
        { stepNumber: 2, stepName: 'Technical Interview', description: 'In-depth technical discussion' },
        { stepNumber: 3, stepName: 'HR Interview', description: 'Cultural fit and salary discussion' },
    ]);

    const updateForm = (key: string, value: any) => setForm({ ...form, [key]: value });

    const updateStepCount = (val: string) => {
        updateForm('interviewStepCount', val);
        if (val === '') return;
        const c = parseInt(val, 10);
        if (!isNaN(c)) {
            const num = Math.min(10, Math.max(1, c));
            const newSteps = [];
            for (let i = 1; i <= num; i++) {
                const existing = steps.find(s => s.stepNumber === i);
                newSteps.push(existing || { stepNumber: i, stepName: `Interview Round ${i}`, description: '' });
            }
            setSteps(newSteps);
        }
    };

    const updateStep = (idx: number, key: string, value: string) => {
        const copy = [...steps];
        copy[idx] = { ...copy[idx], [key]: value };
        setSteps(copy);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = {
                ...form,
                interviewStepCount: Math.max(1, typeof form.interviewStepCount === 'string' ? parseInt(form.interviewStepCount, 10) || 1 : form.interviewStepCount),
                salaryRangeMin: form.salaryRangeMin ? parseFloat(form.salaryRangeMin) : null,
                salaryRangeMax: form.salaryRangeMax ? parseFloat(form.salaryRangeMax) : null,
                interviewSteps: steps,
            };
            const { data } = await jobsApi.create(payload);
            navigate(`/jobs/${data.id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create position');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2>Create New Position</h2>
                <button className="btn btn-secondary" onClick={() => navigate('/jobs')}>← Back to List</button>
            </div>

            <form onSubmit={handleSubmit}>
                {error && <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>}

                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Position Information</h3></div>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Job ID *</label>
                                <input className="form-input" placeholder="e.g., JOB-2024-001" value={form.jobId} onChange={e => updateForm('jobId', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Title *</label>
                                <input className="form-input" placeholder="e.g., Senior Software Engineer" value={form.title} onChange={e => updateForm('title', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Department *</label>
                                <input className="form-input" placeholder="e.g., Engineering" value={form.department} onChange={e => updateForm('department', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input className="form-input" placeholder="e.g., Mumbai, India" value={form.location} onChange={e => updateForm('location', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Hiring Manager *</label>
                                <input className="form-input" placeholder="Manager full name" value={form.managerName} onChange={e => updateForm('managerName', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Number of Positions *</label>
                                <input className="form-input" type="number" min="1" value={form.numberOfPositions} onChange={e => updateForm('numberOfPositions', parseInt(e.target.value))} required />
                            </div>
                            <div className="form-group">
                                <label>Salary Range (Min)</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input className="form-input" type="number" step="0.1" placeholder="e.g., 1" value={form.salaryRangeMin} onChange={e => updateForm('salaryRangeMin', e.target.value)} />
                                    <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>LPA</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Salary Range (Max)</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input className="form-input" type="number" step="0.1" placeholder="e.g., 5" value={form.salaryRangeMax} onChange={e => updateForm('salaryRangeMax', e.target.value)} />
                                    <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>LPA</span>
                                </div>
                            </div>
                            <div className="form-group full-width">
                                <label>Job Description</label>
                                <textarea className="form-textarea" placeholder="Describe the role responsibilities..." value={form.description} onChange={e => updateForm('description', e.target.value)} rows={4} />
                            </div>
                            <div className="form-group full-width">
                                <label>Requirements</label>
                                <textarea className="form-textarea" placeholder="Required qualifications and skills..." value={form.requirements} onChange={e => updateForm('requirements', e.target.value)} rows={4} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <h3>Interview Process</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Steps:</label>
                            <input className="form-input" type="number" min="1" max="10" style={{ width: 70 }} value={form.interviewStepCount} onChange={e => updateStepCount(e.target.value)} />
                        </div>
                    </div>
                    <div className="card-body">
                        {steps.map((step, i) => (
                            <div key={step.stepNumber} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, marginTop: 4 }}>
                                    {step.stepNumber}
                                </div>
                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Step Name</label>
                                        <input className="form-input" value={step.stepName} onChange={e => updateStep(i, 'stepName', e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Description</label>
                                        <input className="form-input" value={step.description || ''} onChange={e => updateStep(i, 'description', e.target.value)} placeholder="Optional description" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/jobs')}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Position'}
                    </button>
                </div>
            </form>
        </div>
    );
}
