import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Predict from '../pages/Predict';
import UserPredictForm from '../components/predict/UserPredictForm';
import BankPredictForm from '../components/predict/BankPredictForm';
import RiskScorecard, { RiskBadge } from '../components/predict/RiskScorecard';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('Predict Page & Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockUserAuth = {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Borrower',
    },
    token: 'jwt-123',
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
  };

  it('renders UserPredictForm with all borrower input fields', () => {
    const formData = {
      loan_type: 'home',
      income: '800000',
      credit_score: '750',
      loan_amount: '2000000',
      missed_payments: '0',
    };
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <UserPredictForm
        formData={formData}
        errors={{}}
        onChange={onChange}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    expect(screen.getByRole('heading', { name: /borrower details/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/loan type/i)).toHaveValue('home');
    expect(screen.getByLabelText(/annual income/i)).toHaveValue(800000);
    expect(screen.getByLabelText(/credit score/i)).toHaveValue(750);
    expect(screen.getByLabelText(/loan amount/i)).toHaveValue(2000000);
    expect(screen.getByLabelText(/missed payments/i)).toHaveValue(0);
    expect(screen.getByRole('button', { name: /predict risk/i })).toBeInTheDocument();
  });

  it('renders BankPredictForm with all underwriting fields', () => {
    const formData = {
      loan_amount: '2500000',
      income: '900000',
      Credit_Score: '720',
      LTV: '75',
      dtir1: '32',
    };
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <BankPredictForm
        formData={formData}
        errors={{}}
        onChange={onChange}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    expect(screen.getByRole('heading', { name: /bank risk analysis/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/loan amount/i)).toHaveValue(2500000);
    expect(screen.getByLabelText(/borrower income/i)).toHaveValue(900000);
    expect(screen.getByLabelText(/credit score/i)).toHaveValue(720);
    expect(screen.getByLabelText(/loan-to-value ratio/i)).toHaveValue(75);
    expect(screen.getByLabelText(/debt-to-income-ratio/i)).toHaveValue(32);
    expect(screen.getByRole('button', { name: /analyse/i })).toBeInTheDocument();
  });

  it('validates user form inputs before prediction', async () => {
    render(
      <AuthContext.Provider value={mockUserAuth}>
        <Predict type="user" />
      </AuthContext.Provider>
    );

    const submitBtn = screen.getByRole('button', { name: /predict risk/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/loan type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a valid annual income/i)).toBeInTheDocument();
      expect(screen.getByText(/credit score must be between 300 and 900/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a valid loan amount/i)).toBeInTheDocument();
    });
  });

  it('renders RiskScorecard with badges, recommendations, and XAI tags', () => {
    const mockUserResult = {
      risk_level: 'Low',
      recommendation_summary: [
        'You are eligible for prime interest rates.',
        'Debt-to-income is well within limits.',
      ],
      tips: ['Maintain timely EMI payments', 'Keep utilization below 30%'],
    };

    render(
      <RiskScorecard
        type="user"
        result={mockUserResult}
        inputData={{
          credit_score: '780',
          income: '1200000',
          loan_amount: '2000000',
          missed_payments: '0',
        }}
      />
    );

    expect(screen.getByText(/risk assessment results/i)).toBeInTheDocument();
    expect(screen.getByText(/90%/i)).toBeInTheDocument(); // 90% approval chance for Low risk
    expect(screen.getByText(/780/i)).toBeInTheDocument();
    expect(screen.getByText(/high credit score/i)).toBeInTheDocument();
    expect(screen.getByText(/\+25%/i)).toBeInTheDocument();
    expect(screen.getByText(/you are eligible for prime interest rates/i)).toBeInTheDocument();
    expect(screen.getAllByText(/maintain timely emi payments/i)[0]).toBeInTheDocument();
  });

  it('submits user prediction and renders scorecard and charts', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        risk_level: 'Low',
        recommendation_summary: ['Eligible profile with strong capacity.'],
        tips: ['Continue maintaining good credit.'],
      },
    });

    render(
      <AuthContext.Provider value={mockUserAuth}>
        <Predict type="user" />
      </AuthContext.Provider>
    );

    // Fill valid form inputs
    fireEvent.change(screen.getByLabelText(/loan type/i), { target: { value: 'home' } });
    fireEvent.change(screen.getByLabelText(/annual income/i), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText(/credit score/i), { target: { value: '750' } });
    fireEvent.change(screen.getByLabelText(/loan amount/i), { target: { value: '2500000' } });
    fireEvent.change(screen.getByLabelText(/missed payments/i), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /predict risk/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/predict/user',
        expect.objectContaining({
          loan_type: 'home',
          income: 1000000,
          credit_score: 750,
          loan_amount: 2500000,
          missed_payments: 0,
        })
      );
      expect(screen.getByText(/eligible profile with strong capacity/i)).toBeInTheDocument();
    });
  });
});
