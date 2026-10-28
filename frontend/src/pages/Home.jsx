import React from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: '🤖',
    title: 'AI-Powered Risk Analysis',
    desc: 'LightGBM model trained on real loan data to predict default probability with high accuracy.',
  },
  {
    icon: '📊',
    title: 'Interactive Dashboards',
    desc: 'Visual charts and graphs to understand your financial risk at a glance.',
  },
  {
    icon: '🏦',
    title: 'Dual Perspective',
    desc: 'Separate interfaces for borrowers and banks — each tailored to your role.',
  },
  {
    icon: '⚡',
    title: 'Instant Predictions',
    desc: 'Get results in seconds. Real-time AI analysis with no delays.',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-badge">✦ Powered by LightGBM &amp; FastAPI</div>

        <h1 className="hero-title" style={{ fontFamily: "'Inter', sans-serif" }}>
          Smarter Loan Decisions<br />
          with <span className="gradient-text">AI Intelligence</span>
        </h1>

        <p className="hero-subtitle">
          CreditPath AI analyzes financial data to predict loan risk, protect
          banks from defaults, and help borrowers understand their credit standing.
        </p>

        {/* Role Cards */}
        <div className="role-cards">
          <div className="role-card user-card" onClick={() => navigate('/predict/user')}>
            <div className="role-card-icon">👤</div>
            <h3 style={{ fontFamily: "'Inter', sans-serif" }}>For Borrowers</h3>
            <p>
              Check your loan eligibility, understand your risk level, and get
              personalized tips to improve your credit health.
            </p>
            <button type="button" className="role-card-btn">User Prediction →</button>
          </div>

          <div className="role-card bank-card" onClick={() => navigate('/predict/bank')}>
            <div className="role-card-icon">🏦</div>
            <h3 style={{ fontFamily: "'Inter', sans-serif" }}>For Banks</h3>
            <p>
              Analyze borrower data, estimate default probability, and receive
              AI-driven loan decisions with recovery recommendations.
            </p>
            <button type="button" className="role-card-btn">Bank Prediction →</button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section">
        <h2 className="section-title">Why CreditPath AI?</h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <h3>Input Details</h3>
            <p>Enter loan amount, income, credit score, and financial ratios.</p>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <h3>AI Analysis</h3>
            <p>Trained LightGBM model calculates default probability and expected loss.</p>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <h3>Instant Decision</h3>
            <p>Get instant approval status, risk badge, and actionable recommendations.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
