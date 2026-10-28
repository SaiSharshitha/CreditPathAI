import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { INBUILT_USERS, INBUILT_HISTORY, INBUILT_GOALS } from '../datadb/mockData';

// Helper to escape CSV values safely to prevent CSV Formula Injection (CWE-1236)
function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let stringVal = String(val);
  // If value begins with =, +, -, @, \t, or \r, prefix with a single quote
  if (/^[=+\-@\t\r]/.test(stringVal)) {
    stringVal = `'${stringVal}`;
  }
  return `"${stringVal.replace(/"/g, '""')}"`;
}

function exportToCsv(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(sanitizeCsvValue).join(',');
  const dataRows = data.map((row) =>
    headers.map((key) => sanitizeCsvValue(row[key])).join(',')
  );
  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Common & User state
  const [history, setHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({ title: '', amount: '', saved: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Admin specific state
  const [adminMetrics, setAdminMetrics] = useState({
    totalUsers: 0,
    totalPredictions: 0,
    highRiskFlagged: 0,
  });
  const [adminUsers, setAdminUsers] = useState([]);
  const [allGoalsMap, setAllGoalsMap] = useState({});

  const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN';

  // Load Data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');

    if (isAdmin) {
      try {
        // 1. Admin Metrics
        let metricsData = null;
        try {
          const resMetrics = await api.get('/admin/metrics');
          metricsData = resMetrics.data;
        } catch {
          // Fallback calculation
          metricsData = null;
        }

        // 2. Admin Users
        let usersData = [];
        try {
          const resUsers = await api.get('/admin/users');
          usersData = resUsers.data?.users || resUsers.data || [];
        } catch {
          const stored = JSON.parse(localStorage.getItem('creditpath_users') || '[]');
          usersData = stored.filter(
            (u) => (u.role || '').toUpperCase() !== 'ADMIN' && u.email !== user.email
          );
        }
        setAdminUsers(usersData);

        // 3. Admin History
        let histData = [];
        try {
          const resHist = await api.get('/admin/history');
          histData = resHist.data?.history || resHist.data || [];
        } catch {
          // Aggregate from localStorage
          let dynamic = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('creditpath_history_')) {
              try {
                const em = k.replace('creditpath_history_', '');
                const d = JSON.parse(localStorage.getItem(k) || '[]');
                dynamic.push(
                  ...d.map((item, idx) => ({
                    ...item,
                    userEmail: em,
                    uniqueId: `${em}-${idx}-${item.timestamp}`,
                  }))
                );
              } catch {}
            }
          }
          histData = [...INBUILT_HISTORY, ...dynamic].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
        }
        setHistory(histData);

        // Set metrics based on live or computed data
        if (metricsData) {
          setAdminMetrics({
            totalUsers: metricsData.total_users ?? metricsData.totalUsers ?? (usersData.length + INBUILT_USERS.length),
            totalPredictions: metricsData.total_predictions ?? metricsData.totalPredictions ?? histData.length,
            highRiskFlagged: metricsData.high_risk_flagged ?? metricsData.highRiskFlagged ?? histData.filter((h) => {
              const r = (h.risk || '').toLowerCase();
              return r.includes('high') || r.includes('reject');
            }).length,
          });
        } else {
          setAdminMetrics({
            totalUsers: usersData.length + INBUILT_USERS.length,
            totalPredictions: histData.length,
            highRiskFlagged: histData.filter((h) => {
              const r = (h.risk || '').toLowerCase();
              return r.includes('high') || r.includes('reject');
            }).length,
          });
        }

        // Goals map for display in history table
        const goalsMapping = { ...INBUILT_GOALS };
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('creditpath_goals_')) {
            try {
              const em = k.replace('creditpath_goals_', '');
              goalsMapping[em] = JSON.parse(localStorage.getItem(k) || '[]');
            } catch {}
          }
        }
        setAllGoalsMap(goalsMapping);
      } catch (err) {
        console.warn('Admin load error:', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Borrower or Bank Agent
      try {
        // Fetch History
        try {
          const resHist = await api.get('/dashboard/history');
          const serverHist = resHist.data?.history || resHist.data;
          if (Array.isArray(serverHist)) {
            setHistory(serverHist);
          } else {
            throw new Error('Invalid format');
          }
        } catch {
          const localHist = JSON.parse(
            localStorage.getItem(`creditpath_history_${user.email}`) || '[]'
          );
          setHistory(localHist.reverse());
        }

        // Fetch Goals
        try {
          const resGoals = await api.get('/dashboard/goals');
          const serverGoals = resGoals.data?.goals || resGoals.data;
          if (Array.isArray(serverGoals)) {
            setGoals(serverGoals);
          } else {
            throw new Error('Invalid format');
          }
        } catch {
          const localGoals = JSON.parse(
            localStorage.getItem(`creditpath_goals_${user.email}`) || '[]'
          );
          setGoals(localGoals);
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadDashboardData();
  }, [user, navigate, loadDashboardData]);

  // Goal Management Handlers
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title || !newGoal.amount) return;

    const goalPayload = {
      id: Date.now().toString(),
      title: newGoal.title,
      amount: Number(newGoal.amount),
      saved: Number(newGoal.saved || 0),
    };

    try {
      try {
        await api.post('/dashboard/goals', goalPayload);
      } catch (apiErr) {
        console.warn('Backend add goal offline, syncing locally:', apiErr);
      }

      const updated = [...goals, goalPayload];
      setGoals(updated);
      if (user?.email) {
        localStorage.setItem(`creditpath_goals_${user.email}`, JSON.stringify(updated));
      }
      setNewGoal({ title: '', amount: '', saved: '' });
    } catch (err) {
      setErrorMsg('Failed to add goal.');
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      try {
        await api.delete(`/dashboard/goals/${id}`);
      } catch (apiErr) {
        console.warn('Backend delete goal offline, syncing locally:', apiErr);
      }

      const updated = goals.filter((g) => g.id !== id && String(g.id) !== String(id));
      setGoals(updated);
      if (user?.email) {
        localStorage.setItem(`creditpath_goals_${user.email}`, JSON.stringify(updated));
      }
    } catch (err) {
      setErrorMsg('Failed to delete goal.');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear your prediction history?')) {
      if (user?.email) {
        localStorage.removeItem(`creditpath_history_${user.email}`);
      }
      setHistory([]);
    }
  };

  const handleAdminExportCsv = async () => {
    try {
      try {
        const res = await api.get('/admin/export-csv', { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'creditpath_admin_export.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      } catch {
        // Fallback to client-side sanitized export
        exportToCsv(history, 'creditpath_system_history.csv');
      }
    } catch (e) {
      console.error('Export CSV error:', e);
    }
  };

  if (!user) return null;

  // ──────────────────────────── ADMIN DASHBOARD ────────────────────────────
  if (isAdmin) {
    return (
      <div className="predict-page" style={{ maxWidth: 1000 }}>
        <div className="predict-header">
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '2rem' }}>
            🛠️ Admin Control Center
          </h1>
          <p>Welcome back, Admin {user.name}. View aggregate system analytics below.</p>
        </div>

        <div className="predict-card">
          <div className="metric-cards">
            <div className="metric-card">
              <div className="metric-label">Total Users</div>
              <div className="metric-value">{adminMetrics.totalUsers}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Predictions</div>
              <div className="metric-value">{adminMetrics.totalPredictions}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">High Risk Flagged</div>
              <div className="metric-value" style={{ color: 'var(--danger)' }}>
                {adminMetrics.highRiskFlagged}
              </div>
            </div>
          </div>

          {/* Real Manual Signups */}
          <div style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ borderLeft: '4px solid var(--accent)', paddingLeft: 12, margin: 0 }}>
                👥 Real Manual Signups
              </h3>
              <button
                type="button"
                onClick={() => exportToCsv(adminUsers, 'creditpath_real_users.csv')}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                }}
              >
                📥 Export CSV
              </button>
            </div>

            {adminUsers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No manual signups yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30, fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Role</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px 8px', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: '16px 8px' }}>{u.email}</td>
                        <td style={{ padding: '16px 8px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--success)',
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* All System History */}
          <div style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ borderLeft: '4px solid var(--accent-gold)', paddingLeft: 12, margin: 0 }}>
                📊 All System History
              </h3>
              <button
                type="button"
                onClick={handleAdminExportCsv}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                }}
              >
                📥 Export CSV
              </button>
            </div>

            {history.length === 0 ? (
              <p>No data recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>User</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>User Goal</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Loan Category</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Decision / Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, index) => {
                      const userGoal = allGoalsMap[item.userEmail]?.[0]?.title || 'N/A';
                      const uInfo = adminUsers.find((u) => u.email === item.userEmail);
                      const isLow =
                        (item.risk || '').toLowerCase() === 'low' || item.risk === 'Approved';
                      const isMed =
                        (item.risk || '').toLowerCase() === 'medium' ||
                        item.risk === 'Conditionally Approved';
                      return (
                        <tr
                          key={item.uniqueId || index}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <td style={{ padding: '16px 8px' }}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{ fontWeight: 600 }}>{uInfo?.name || item.userName || 'Borrower'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.userEmail || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', color: 'var(--accent)', fontWeight: 500 }}>
                            {userGoal}
                          </td>
                          <td style={{ padding: '16px 8px', textTransform: 'capitalize' }}>
                            {item.loan_type ? item.loan_type.replace('_', ' ') : 'General'}
                          </td>
                          <td style={{ padding: '16px 8px', fontWeight: 600 }}>
                            {item.type === 'user' ? '👤 User' : '🏦 Bank'}
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                            ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                            <span className={`risk-badge ${isLow ? 'low' : isMed ? 'medium' : 'high'}`}>
                              {item.risk}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────── BORROWER / AGENT DASHBOARD ────────────────────────────
  return (
    <div className="predict-page" style={{ maxWidth: 900 }}>
      <div className="predict-header" style={{ textAlign: 'left' }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '2rem' }}>
          👋 Welcome back, {user.name ? user.name.split(' ')[0] : 'User'}!
        </h1>
        <p>Member Since: {new Date(user.createdAt || user.loggedInAt || Date.now()).toLocaleDateString()}</p>
      </div>

      {errorMsg && <div className="error-box" style={{ marginBottom: 20 }}>{errorMsg}</div>}

      {/* 🎯 Financial Goals Section */}
      <div className="predict-card" style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <div className="title-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>🎯</div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", margin: 0 }}>Personal Financial Goals</h2>
        </div>

        <form
          onSubmit={handleAddGoal}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: 24,
          }}
        >
          <input
            className="form-input"
            placeholder="Goal (e.g. Home Downpayment)"
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Target Amount (₹)"
            value={newGoal.amount}
            onChange={(e) => setNewGoal({ ...newGoal, amount: e.target.value })}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Already Saved (₹)"
            value={newGoal.saved}
            onChange={(e) => setNewGoal({ ...newGoal, saved: e.target.value })}
          />
          <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
            Add Goal
          </button>
        </form>

        {goals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            You haven't set any financial goals yet. What are you saving for?
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {goals.map((goal) => {
              const target = Number(goal.amount) || 1;
              const saved = Number(goal.saved || 0);
              const progress = Math.min(100, (saved / target) * 100);
              return (
                <div
                  key={goal.id}
                  style={{
                    padding: 16,
                    background: 'var(--bg-secondary)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>{goal.title}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    ₹{saved.toLocaleString('en-IN')} of ₹{Number(goal.amount).toLocaleString('en-IN')}
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 0.5s ease-out',
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', marginTop: 4, color: 'var(--accent)', fontWeight: 600 }}>
                    {progress.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📜 Prediction History */}
      <div className="predict-card">
        <div className="predict-card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="title-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>📜</div>
            <h2 style={{ fontFamily: "'Inter', sans-serif" }}>Prediction History</h2>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.85rem',
              }}
            >
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="info-box" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <h4>No history found</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Run your first prediction on the User or Bank tab to see it here!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => {
                  const isLow =
                    (item.risk || '').toLowerCase() === 'low' || item.risk === 'Approved';
                  const isMed =
                    (item.risk || '').toLowerCase() === 'medium' ||
                    item.risk === 'Conditionally Approved';
                  return (
                    <React.Fragment key={index}>
                      <tr
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                        className="history-row"
                      >
                        <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>
                          {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '16px 8px', fontWeight: 600 }}>
                          {item.type === 'user' ? '👤 User' : '🏦 Bank'}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                          <span className={`risk-badge ${isLow ? 'low' : isMed ? 'medium' : 'high'}`}>
                            {item.risk}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === index ? null : index)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent)',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {expandedId === index ? 'Close ▲' : 'Details ▼'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === index && (
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <td colSpan="5" style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '16px',
                              }}
                            >
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                                  Time
                                </div>
                                <div style={{ fontWeight: 600 }}>
                                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                                  Calculation ID
                                </div>
                                <div style={{ fontWeight: 600 }}>
                                  #{item.timestamp ? item.timestamp.split('T')[0].replace(/-/g, '') : 'REF'}-{index}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                                  Summary
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>
                                  Prediction completed with {item.risk} profile for ₹
                                  {Number(item.amount || 0).toLocaleString('en-IN')} application.
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
