import React from 'react';

export default function BankPredictForm({
  formData,
  errors = {},
  onChange,
  onSubmit,
  loading = false,
}) {
  return (
    <div className="predict-card bank-predict">
      <div className="predict-card-title">
        <div className="title-icon">🏦</div>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>
          Bank Risk Analysis
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
            <label htmlFor="bank-loan-amount">Loan Amount (₹)</label>
            <input
              id="bank-loan-amount"
              aria-label="Loan Amount"
              className={`form-input ${errors.loan_amount ? 'input-error' : ''}`}
              type="number"
              name="loan_amount"
              placeholder="e.g. 2500000"
              value={formData.loan_amount}
              onChange={onChange}
            />
            {errors.loan_amount && <span className="error-text">{errors.loan_amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bank-income">Borrower Income (₹)</label>
            <input
              id="bank-income"
              aria-label="Borrower Income"
              className={`form-input ${errors.income ? 'input-error' : ''}`}
              type="number"
              name="income"
              placeholder="e.g. 900000"
              value={formData.income}
              onChange={onChange}
            />
            {errors.income && <span className="error-text">{errors.income}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bank-credit-score">Credit Score (300-900)</label>
            <input
              id="bank-credit-score"
              aria-label="Credit Score"
              className={`form-input ${errors.Credit_Score ? 'input-error' : ''}`}
              type="number"
              name="Credit_Score"
              placeholder="e.g. 720"
              value={formData.Credit_Score}
              onChange={onChange}
            />
            {errors.Credit_Score && <span className="error-text">{errors.Credit_Score}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bank-ltv">Loan-to-Value Ratio (LTV %)</label>
            <input
              id="bank-ltv"
              aria-label="Loan-to-Value Ratio"
              className={`form-input ${errors.LTV ? 'input-error' : ''}`}
              type="number"
              name="LTV"
              placeholder="e.g. 75"
              value={formData.LTV}
              onChange={onChange}
            />
            {errors.LTV && <span className="error-text">{errors.LTV}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bank-dti">Debt-to-Income-Ratio (DTI %)</label>
            <input
              id="bank-dti"
              aria-label="Debt-to-Income-Ratio"
              className={`form-input ${errors.dtir1 ? 'input-error' : ''}`}
              type="number"
              name="dtir1"
              placeholder="e.g. 32"
              value={formData.dtir1}
              onChange={onChange}
            />
            {errors.dtir1 && <span className="error-text">{errors.dtir1}</span>}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? (
            <>
              <span className="spinner" /> Analysing…
            </>
          ) : (
            '📊 Analyse'
          )}
        </button>
      </form>
    </div>
  );
}
