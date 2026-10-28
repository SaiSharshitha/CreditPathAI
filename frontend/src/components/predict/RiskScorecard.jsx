import React from 'react';

export function RiskBadge({ level }) {
  const norm = (level || '').toLowerCase();
  const cls = norm.includes('low') || norm.includes('approved')
    ? 'low'
    : norm.includes('medium') || norm.includes('conditionally')
    ? 'medium'
    : 'high';

  const emoji = cls === 'low' ? '🟢' : cls === 'medium' ? '🟡' : '🔴';
  return <span className={`risk-badge ${cls}`}>{emoji} {level}</span>;
}

export function infoClass(risk) {
  const norm = (risk || '').toLowerCase();
  if (norm.includes('low') || norm.includes('approved')) return 'info-box success-box';
  if (norm.includes('medium') || norm.includes('conditionally')) return 'info-box warning-box';
  return 'info-box danger-box';
}

export default function RiskScorecard({ type, result, inputData = {} }) {
  if (!result) return null;

  if (type === 'user') {
    const riskLevel = result.risk_level || 'Medium';
    const approvalRate =
      riskLevel === 'Low' ? 90 : riskLevel === 'Medium' ? 60 : 30;
    const rateColor =
      approvalRate >= 70
        ? 'var(--success)'
        : approvalRate >= 50
        ? 'var(--warning)'
        : 'var(--danger)';

    // Dynamic XAI logic based on inputs
    const cs = Number(inputData.credit_score || 0);
    const inc = Number(inputData.income || 0);
    const amt = Number(inputData.loan_amount || 0);
    const missed = Number(inputData.missed_payments || 0);

    const xaiReasons = [];
    if (cs >= 750) {
      xaiReasons.push({ label: 'High credit score', impact: '+25%', pos: true });
    } else if (cs < 600) {
      xaiReasons.push({ label: 'Low credit score', impact: '-30%', pos: false });
    } else {
      xaiReasons.push({ label: 'Average credit score', impact: '+5%', pos: true });
    }

    if (inc > amt * 0.5) {
      xaiReasons.push({ label: 'Strong income coverage', impact: '+15%', pos: true });
    } else {
      xaiReasons.push({ label: 'Income to loan ratio', impact: '-10%', pos: false });
    }

    if (missed > 0) {
      xaiReasons.push({ label: 'Missed payments history', impact: '-15%', pos: false });
    } else {
      xaiReasons.push({ label: 'Perfect repayment history', impact: '+10%', pos: true });
    }

    // Optimization advice
    let dtiAdvice = null;
    if (riskLevel !== 'Low' && inc > 0) {
      const incomeMonth = inc / 12;
      const targetMonthlyDebt = incomeMonth * 0.3;
      const currentMonthlyDebt = incomeMonth * (riskLevel === 'High' ? 0.6 : 0.45);
      const reductionNeeded = Math.max(0, currentMonthlyDebt - targetMonthlyDebt);

      dtiAdvice = {
        reduction: Math.round(reductionNeeded).toLocaleString('en-IN'),
        targetDTI: '30%',
        urgency: riskLevel === 'High' ? 'Critical' : 'Moderate',
      };
    }

    return (
      <div className="results-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div className="results-title" style={{ margin: 0 }}>🎯 Risk Assessment Results</div>
          <button
            type="button"
            className="btn-primary"
            style={{
              padding: '8px 16px',
              width: 'auto',
              background: 'var(--bg-card)',
              color: 'var(--accent)',
              border: '1px solid var(--border)',
            }}
            onClick={() => window.print()}
          >
            📄 Download PDF
          </button>
        </div>

        <div className="metric-cards">
          <div className="metric-card">
            <div className="metric-label">RISK LEVEL</div>
            <RiskBadge level={riskLevel} />
          </div>
          <div className="metric-card">
            <div className="metric-label">APPROVAL CHANCE</div>
            <div className="metric-value" style={{ color: rateColor }}>
              {approvalRate}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CREDIT SCORE</div>
            <div className="metric-value" style={{ color: 'var(--accent)' }}>
              {inputData.credit_score || 'N/A'}
            </div>
          </div>
        </div>

        {/* AI Insights & Tips Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: 16 }}>
          {/* Card 1: AI Agent Recommendation */}
          <div className="info-box" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', margin: 0 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>🤖 AI Recommendations</h4>
            {result.recommendation_summary && result.recommendation_summary.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {result.recommendation_summary.map((line, index) => (
                  <li key={index} style={{ marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No summary available.</p>
            )}
          </div>

          {/* Card 2: Risk Factor Impact */}
          <div className="info-box" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', margin: 0 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>⚡ Risk Factor Impact (XAI)</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {xaiReasons.map((r, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                  <span>{r.pos ? '✔ ' : '❌ '}{r.label}</span>
                  <span style={{ color: r.pos ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{r.impact}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3: Actionable Financial Tips */}
          <div className="info-box" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', margin: 0 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>💡 Actionable Financial Tips</h4>
            {result.tips && result.tips.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {result.tips.map((tip, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'var(--bg-card)',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ color: 'var(--success)' }}>✓</span> {tip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Card 4: General Guidance */}
          <div className="info-box" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', margin: 0 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>📘 General Guidance</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: 8, fontSize: '0.9rem' }}>• Maintain timely EMI payments to build history.</li>
              <li style={{ marginBottom: 8, fontSize: '0.9rem' }}>• Keep credit utilization below 30% of your limit.</li>
              <li style={{ marginBottom: 8, fontSize: '0.9rem' }}>• Avoid multiple credit inquiries in a short duration.</li>
            </ul>
          </div>
        </div>

        {/* Final Suggestion */}
        <div className={infoClass(riskLevel)} style={{ marginTop: 16 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>✅ Final Suggestion</h4>
          <p style={{ fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
            {riskLevel === 'Low'
              ? 'You can proceed with the loan application confidently. Your profile shows strong repayment capacity.'
              : riskLevel === 'Medium'
              ? 'Consider improving your credit score slightly or clearing small debts before applying to get better interest rates.'
              : 'We recommend waiting for 6 months and improving your financial health before applying for this loan.'}
          </p>
        </div>

        {/* Optimization Strategy */}
        {dtiAdvice && (
          <div style={{ marginTop: 20 }}>
            <div className="results-title" style={{ marginBottom: 16 }}>⚡ Optimization Strategy</div>
            <div
              className="info-box danger-box"
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: 'var(--danger)' }}>Reduce Debt to Qualify</h4>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  {dtiAdvice.urgency} Priority
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', marginBottom: 0 }}>
                We recommend a monthly reduction of <strong style={{ color: 'var(--danger)' }}>₹{dtiAdvice.reduction}</strong> to reach a healthy <strong style={{ color: 'var(--success)' }}>{dtiAdvice.targetDTI}</strong> DTI ratio.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Bank Scorecard
  const defaultProb = typeof result.default_probability === 'number' ? result.default_probability : 0.15;
  const expectedLoss =
    typeof result.expected_loss === 'number'
      ? result.expected_loss
      : Math.round(Number(inputData.loan_amount || 0) * defaultProb * 0.45);
  const loanStatus = result.loan_status || (defaultProb < 0.3 ? 'Approved' : defaultProb < 0.6 ? 'Conditionally Approved' : 'High Risk');
  const decision = result.bank_decision || {};
  const priority = decision.priority || (defaultProb > 0.4 ? 'High' : defaultProb > 0.2 ? 'Medium' : 'Low');

  return (
    <div className="results-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="results-title" style={{ margin: 0 }}>📊 Financial Risk Scorecard</div>
        <button
          type="button"
          className="btn-primary"
          style={{
            padding: '8px 16px',
            width: 'auto',
            background: 'var(--bg-card)',
            color: 'var(--accent)',
            border: '1px solid var(--border)',
          }}
          onClick={() => window.print()}
        >
          📄 Download Report
        </button>
      </div>

      <div className="metric-cards">
        <div className="metric-card">
          <div className="metric-label">LOAN STATUS</div>
          <RiskBadge level={loanStatus} />
        </div>
        <div className="metric-card">
          <div className="metric-label">DEFAULT PROB.</div>
          <div className="metric-value">{(defaultProb * 100).toFixed(1)}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">EXPECTED LOSS</div>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>
            ₹{expectedLoss.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">PRIORITY</div>
          <div className="metric-value" style={{ color: priority === 'High' ? 'var(--danger)' : 'var(--accent)' }}>
            {priority}
          </div>
        </div>
      </div>

      {/* AI Decision Plan & Banking Guidelines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: 16 }}>
        <div className="info-box" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', margin: 0 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>🤖 AI Decision Plan</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <li style={{ marginBottom: 6 }}>
              • Recovery Channel: {decision.recovery_channel || (loanStatus === 'Approved' ? 'Email + SMS' : 'Collection + Legal Notice')}
            </li>
            <li style={{ marginBottom: 6 }}>
              • Follow-up Schedule: {decision.follow_up || (loanStatus === 'Approved' ? '15 days' : 'Immediate')}
            </li>
            <li style={{ marginBottom: 6 }}>
              • Final Suggestion: {loanStatus === 'Approved' ? 'Approve with standard monitoring.' : 'Strict collateral or rejection recommended.'}
            </li>
          </ul>
        </div>

        <div className="info-box" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', margin: 0 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>🏦 Standard Banking Guidelines</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <li style={{ marginBottom: 6 }}>• Verify borrower income proofs and tax returns before final disbursement.</li>
            <li style={{ marginBottom: 6 }}>
              • Ensure LTV is within target limits ({inputData.LTV ? `Current: ${inputData.LTV}%` : 'Standard: ≤80%'}).
            </li>
            <li style={{ marginBottom: 6 }}>
              • Confirm DTI is below max threshold ({inputData.dtir1 ? `Current: ${inputData.dtir1}%` : 'Standard: ≤40%'}).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
