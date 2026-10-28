import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const DEMO_PASSWORD = 'CreditPath@2026';

const DEMO_ACCOUNTS = [
  { label: '👑 Admin', email: 'admin@creditpath.ai', role: 'Admin' },
  { label: '🏦 Bank Agent', email: 'agent@creditpath.ai', role: 'Bank Agent' },
  { label: '👤 Borrower', email: 'borrower@creditpath.ai', role: 'Borrower' },
];

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Borrower',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSelectDemo = (demo) => {
    setActiveTab('login');
    setFormData({
      ...formData,
      email: demo.email,
      password: DEMO_PASSWORD,
      role: demo.role,
    });
    setError('');
    setSuccess(`Loaded demo credentials for ${demo.label}. Click 'Sign In' to proceed.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        const res = await login(formData.email, formData.password);
        if (res.success) {
          navigate(from, { replace: true });
        } else {
          setError(res.message || 'Login failed.');
        }
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          setError('Please fill in all required fields.');
          setIsSubmitting(false);
          return;
        }
        const res = await signup(formData.name, formData.email, formData.password, formData.role);
        if (res.success) {
          setSuccess('Account created successfully! Please sign in with your credentials.');
          setActiveTab('login');
          setFormData((prev) => ({ ...prev, password: '' }));
        } else {
          setError(res.message || 'Registration failed.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="predict-page" style={{ maxWidth: 460, marginTop: 40, marginBottom: 60 }}>
      <div className="predict-card" style={{ padding: '32px 28px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💳</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, margin: 0, fontSize: '1.75rem' }}>
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 6 }}>
            {activeTab === 'login'
              ? 'Access intelligent risk analytics and portfolio insights'
              : 'Sign up to model loan approvals and evaluate default exposure'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: 10,
            padding: 4,
            marginBottom: 24,
            border: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            aria-label="Sign In Tab"
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 8,
              background: activeTab === 'login' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'login' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'login' ? 700 : 500,
              boxShadow: activeTab === 'login' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'signup'}
            aria-label="Register Tab"
            onClick={() => {
              setActiveTab('signup');
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 8,
              background: activeTab === 'signup' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'signup' ? 700 : 500,
              boxShadow: activeTab === 'signup' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Register
          </button>
        </div>

        {/* Quick Demo Accounts Pills */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            ⚡ Quick 1-Click Demo Accounts
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => handleSelectDemo(demo)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.2s',
                }}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="error-box" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}
        {success && (
          <div className="info-box success-box" style={{ marginBottom: 18 }}>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="form-group" style={{ gap: 16 }}>
          {activeTab === 'signup' && (
            <div>
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                className="form-input"
                name="name"
                placeholder="Alex Morgan"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              className="form-input"
              type="email"
              name="email"
              placeholder="user@creditpath.ai"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="form-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {activeTab === 'signup' && (
            <div>
              <label htmlFor="auth-role">Role</label>
              <select
                id="auth-role"
                className="form-select"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="Borrower">👤 Borrower</option>
                <option value="Bank Agent">🏦 Bank Agent</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ marginTop: 8 }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" /> Processing…
              </>
            ) : activeTab === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer switch */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {activeTab === 'login' ? "Don't have an account?" : 'Already registered?'}
          <button
            type="button"
            onClick={() => {
              setActiveTab(activeTab === 'login' ? 'signup' : 'login');
              setError('');
              setSuccess('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 6,
              textDecoration: 'underline',
            }}
          >
            {activeTab === 'login' ? 'Register now' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  );
}
