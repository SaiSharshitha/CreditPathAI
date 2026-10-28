import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

export default function RiskCharts({ type, result, inputData = {} }) {
  if (!result) return null;

  if (type === 'user') {
    const riskLevel = result.risk_level || 'Medium';
    const approvalRate =
      riskLevel === 'Low' ? 90 : riskLevel === 'Medium' ? 60 : 30;
    const remainingRate = 100 - approvalRate;
    const creditScore = Number(inputData.credit_score) || 650;
    const income = Number(inputData.income) || 0;
    const loanAmount = Number(inputData.loan_amount) || 0;

    const approvalPieData = [
      { name: 'Approved', value: approvalRate, color: '#10b981' },
      { name: 'Remaining', value: remainingRate, color: '#ef4444' },
    ];

    const scoreComparisonData = [
      { name: 'Target', score: 750, fill: '#f59e0b' },
      { name: 'Your Score', score: creditScore, fill: '#3b82f6' },
    ];

    const riskLevelPieData = [
      { name: 'Your Score', value: creditScore, color: '#3b82f6' },
      { name: 'Improvement Area', value: Math.max(0, 900 - creditScore), color: '#cbd5e1' },
    ];

    const financialOverviewData = [
      { name: 'Income', amount: income, fill: '#10b981' },
      { name: 'Loan Amt', amount: loanAmount, fill: '#3b82f6' },
    ];

    return (
      <div
        className="charts-grid"
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        {/* 1. Loan Approval Pie */}
        <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Loan Approval Chance</h4>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={approvalPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {approvalPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val) => `${val}%`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Credit Score Comparison */}
        <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Credit Score Comparison</h4>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis domain={[0, 900]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {scoreComparisonData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. User Risk Level Breakdown */}
        <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>User Risk Score Breakdown</h4>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskLevelPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskLevelPieData.map((entry, index) => (
                    <Cell key={`cell-risk-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Financial Overview */}
        <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>User Financial Overview (₹)</h4>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialOverviewData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {financialOverviewData.map((entry, index) => (
                    <Cell key={`cell-fin-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Bank Charts
  const defaultProb = typeof result.default_probability === 'number' ? result.default_probability : 0.15;
  const defPercent = Math.round(defaultProb * 100);
  const safePercent = 100 - defPercent;
  const loanAmount = Number(inputData.loan_amount) || 0;
  const expectedLoss =
    typeof result.expected_loss === 'number'
      ? result.expected_loss
      : Math.round(loanAmount * defaultProb * 0.45);
  const dti = Number(inputData.dtir1) || 0;

  const riskDistData = [
    { name: 'Safe', value: safePercent, color: '#3b82f6' },
    { name: 'Default Risk', value: defPercent, color: '#ef4444' },
  ];

  const defaultProbData = [
    { name: 'Safe', value: safePercent, fill: '#3b82f6' },
    { name: 'Default Prob', value: defPercent, fill: '#f59e0b' },
  ];

  const valueAtRiskData = [
    { name: 'Expected Loss', amount: expectedLoss, fill: '#ef4444' },
    { name: 'Loan Amount', amount: loanAmount, fill: '#3b82f6' },
  ];

  const dtiComparisonData = [
    { name: 'DTI', ratio: dti, fill: '#3b82f6' },
    { name: 'Max Threshold', ratio: 40, fill: '#f59e0b' },
  ];

  return (
    <div
      className="charts-grid"
      style={{
        marginTop: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
      }}
    >
      {/* 1. Risk Distribution Pie */}
      <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Risk Distribution</h4>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskDistData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {riskDistData.map((entry, index) => (
                  <Cell key={`cell-bank-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(val) => `${val}%`} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Default Probability Bar */}
      <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Default Probability (%)</h4>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={defaultProbData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <RechartsTooltip formatter={(val) => `${val}%`} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {defaultProbData.map((entry, index) => (
                  <Cell key={`cell-dp-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Value at Risk */}
      <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Value at Risk (₹)</h4>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valueAtRiskData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <RechartsTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {valueAtRiskData.map((entry, index) => (
                  <Cell key={`cell-var-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. DTI Comparison */}
      <div className="chart-card" style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>DTI Comparison (%)</h4>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dtiComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <RechartsTooltip formatter={(val) => `${val}%`} />
              <Bar dataKey="ratio" radius={[6, 6, 0, 0]}>
                {dtiComparisonData.map((entry, index) => (
                  <Cell key={`cell-dti-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
