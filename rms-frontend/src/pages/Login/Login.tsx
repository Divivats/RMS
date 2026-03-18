import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import Loader from '../../components/Loader';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await authApi.login(email, password);
            setTimeout(() => {
                login(data);
                navigate('/');
            }, 1000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
            setLoading(false);
        }
    };

    if (loading && !error) {
        return <Loader />;
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <h1>
                        <span>RMS</span> Portal
                    </h1>
                    <p>Recruitment Management System</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 24, padding: '14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Demo Credentials:</strong>
                    <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                        <div>HR/Admin: <code style={{ background: 'var(--accent-bg)', padding: '2px 6px', borderRadius: 4 }}>hr@rms.com</code> / <code style={{ background: 'var(--accent-bg)', padding: '2px 6px', borderRadius: 4 }}>Admin@123</code></div>
                        <div>Consultant: <code style={{ background: 'var(--accent-bg)', padding: '2px 6px', borderRadius: 4 }}>consultant@rms.com</code> / <code style={{ background: 'var(--accent-bg)', padding: '2px 6px', borderRadius: 4 }}>Consult@123</code></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
