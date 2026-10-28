import React from 'react';

function Tooltip({ text }) {
  return (
    <span className="tooltip-container">
      <span className="tooltip-icon">ℹ️</span>
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

export default function UserPredictForm({
  formData,
  errors = {},
  onChange,
  onSubmit,
  loading = false,
}) {
  return (
    <div className="predict-card user-predict">
      <div className="predict-card-title">
        <div className="title-icon">👤</div>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>
          Borrower Details
        </h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="user-loan-type">Loan Type</label>
            <select
              id="user-loan-type"
              aria-label="Loan Type"
              className={`form-select ${errors.loan_type ? 'input-error' : ''}`}
              name="loan_type"
              value={formData.loan_type}
              onChange={onChange}
            >
              <option value="">Select...</option>
              <option value="home">🏠 Home Loan</option>
              <option value="car">🚗 Car Loan</option>
              <option value="personal">💳 Personal Loan</option>
              <option value="gold">🏆 Gold Loan</option>
              <option value="food">🍔 Food Business</option>
              <option value="mall">🏬 Shopping Mall</option>
              <option value="restaurant">🍱 Restaurant</option>
              <option value="agri">🚜 Agriculture Loan</option>
              <option value="edu">🎓 Education Loan</option>
              <option value="medical">🏥 Medical Loan</option>
              <option value="commercial">🏢 Commercial Real Estate</option>
              <option value="msme">💻 MSME Business Loan</option>
              <option value="wedding">💍 Wedding Loan</option>
              <option value="travel">🛫 Travel Loan</option>
              <option value="solar">🔋 Solar/Green Energy</option>
            </select>
            {errors.loan_type && <span className="error-text">{errors.loan_type}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="user-income">Annual Income (₹)</label>
            <input
              id="user-income"
              aria-label="Annual Income"
              className={`form-input ${errors.income ? 'input-error' : ''}`}
              type="number"
              name="income"
              placeholder="e.g. 750000"
              value={formData.income}
              onChange={onChange}
            />
            {errors.income && <span className="error-text">{errors.income}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="user-credit-score">Credit Score (300-900)</label>
            <input
              id="user-credit-score"
              aria-label="Credit Score"
              className={`form-input ${errors.credit_score ? 'input-error' : ''}`}
              type="number"
              name="credit_score"
              placeholder="e.g. 750"
              value={formData.credit_score}
              onChange={onChange}
            />
            {errors.credit_score && <span className="error-text">{errors.credit_score}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="user-loan-amount">Loan Amount (₹)</label>
            <input
              id="user-loan-amount"
              aria-label="Loan Amount"
              className={`form-input ${errors.loan_amount ? 'input-error' : ''}`}
              type="number"
              name="loan_amount"
              placeholder="e.g. 1500000"
              value={formData.loan_amount}
              onChange={onChange}
            />
            {errors.loan_amount && <span className="error-text">{errors.loan_amount}</span>}
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="user-missed-payments">
              Missed Payments{' '}
              <Tooltip text="The number of times you've missed loan or card payments in the last 12 months." />
            </label>
            <input
              id="user-missed-payments"
              aria-label="Missed Payments"
              className={`form-input ${errors.missed_payments ? 'input-error' : ''}`}
              type="number"
              name="missed_payments"
              placeholder="0"
              value={formData.missed_payments}
              onChange={onChange}
            />
            {errors.missed_payments && <span className="error-text">{errors.missed_payments}</span>}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? (
            <>
              <span className="spinner" /> Analysing…
            </>
          ) : (
            '📊 Predict Risk'
          )}
        </button>
      </form>
    </div>
  );
}
