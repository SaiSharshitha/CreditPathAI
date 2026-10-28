import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import UserPredictForm from '../components/predict/UserPredictForm';
import BankPredictForm from '../components/predict/BankPredictForm';
import RiskScorecard from '../components/predict/RiskScorecard';
import RiskCharts from '../components/predict/RiskCharts';

export default function Predict({ type }) {
  const { user } = useContext(AuthContext);

  const [userData, setUserData] = useState({
    loan_type: '',
    income: '',
    credit_score: '',
    loan_amount: '',
    missed_payments: '',
  });

  const [bankData, setBankData] = useState({
    loan_amount: '',
    income: '',
    Credit_Score: '',
    LTV: '',
    dtir1: '',
  });

  const [userResult, setUserResult] = useState(null);
  const [bankResult, setBankResult] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [userError, setUserError] = useState(null);
  const [bankError, setBankError] = useState(null);
  const [userValidationErrors, setUserValidationErrors] = useState({});
  const [bankValidationErrors, setBankValidationErrors] = useState({});

  // Reset errors and results on tab/type switch
  useEffect(() => {
    setUserResult(null);
    setBankResult(null);
    setUserError(null);
    setBankError(null);
    setUserValidationErrors({});
    setBankValidationErrors({});
    setUserData((prev) => ({
      loan_type: prev.loan_type,
      income: '',
      credit_score: '',
      loan_amount: '',
      missed_payments: '',
    }));
    setBankData({
      loan_amount: '',
      income: '',
      Credit_Score: '',
      LTV: '',
      dtir1: '',
    });
  }, [type]);

  // Goal Matching Logic: Pre-select loan type based on user goals
  useEffect(() => {
    if (user && user.email) {
      const savedGoals = localStorage.getItem(`creditpath_goals_${user.email}`);
      if (savedGoals) {
        try {
          const goals = JSON.parse(savedGoals);
          if (goals.length > 0) {
            const latestGoal = (goals[goals.length - 1].title || '').toLowerCase();
            const mapping = {
              home: 'home',
              house: 'home',
              flat: 'home',
              apartment: 'home',
              car: 'car',
              vehicle: 'car',
              bike: 'car',
              study: 'edu',
              education: 'edu',
              college: 'edu',
              university: 'edu',
              gold: 'gold',
              jewel: 'gold',
              ornament: 'gold',
              food: 'food',
              restaurant: 'restaurant',
              cafe: 'restaurant',
              mall: 'mall',
              shop: 'mall',
              store: 'mall',
              farm: 'agri',
              agriculture: 'agri',
              crop: 'agri',
              medical: 'medical',
              hospital: 'medical',
              health: 'medical',
              business: 'msme',
              startup: 'msme',
              msme: 'msme',
              wedding: 'wedding',
              marriage: 'wedding',
              travel: 'travel',
              vacation: 'travel',
              trip: 'travel',
              solar: 'solar',
              energy: 'solar',
              green: 'solar',
            };
            for (const [kw, loanCat] of Object.entries(mapping)) {
              if (latestGoal.includes(kw)) {
                setUserData((prev) => ({ ...prev, loan_type: loanCat }));
                break;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing goals:', e);
        }
      }
    }
  }, [user]);

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
    if (userValidationErrors[name]) {
      setUserValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankData((prev) => ({ ...prev, [name]: value }));
    if (bankValidationErrors[name]) {
      setBankValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateUserForm = () => {
    const errors = {};
    if (!userData.loan_type) errors.loan_type = 'Loan type is required';
    if (!userData.income || Number(userData.income) <= 0) errors.income = 'Please enter a valid annual income';
    if (!userData.credit_score || Number(userData.credit_score) < 300 || Number(userData.credit_score) > 900) {
      errors.credit_score = 'Credit score must be between 300 and 900';
    }
    if (!userData.loan_amount || Number(userData.loan_amount) <= 0) errors.loan_amount = 'Please enter a valid loan amount';
    if (userData.loan_amount && userData.income && Number(userData.loan_amount) > Number(userData.income) * 5) {
      errors.loan_amount = '⚠️ Loan amount is >5x your annual income. This usually leads to high risk.';
    }
    if (userData.missed_payments === '' || Number(userData.missed_payments) < 0) {
      errors.missed_payments = 'Must be 0 or greater';
    }

    setUserValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBankForm = () => {
    const errors = {};
    if (!bankData.loan_amount || Number(bankData.loan_amount) <= 0) errors.loan_amount = 'Please enter a valid loan amount';
    if (!bankData.income || Number(bankData.income) <= 0) errors.income = 'Please enter a valid income';
    if (!bankData.Credit_Score || Number(bankData.Credit_Score) < 300 || Number(bankData.Credit_Score) > 900) {
      errors.Credit_Score = 'Credit score must be between 300 and 900';
    }
    if (bankData.LTV === '' || Number(bankData.LTV) < 0 || Number(bankData.LTV) > 100) errors.LTV = 'LTV must be 0-100%';
    if (bankData.dtir1 === '' || Number(bankData.dtir1) < 0 || Number(bankData.dtir1) > 100) errors.dtir1 = 'DTI must be 0-100%';

    setBankValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const predictUser = async () => {
    if (!user) {
      setUserError('🔒 Please log in to your account to perform predictions.');
      return;
    }
    if (!validateUserForm()) {
      setUserError('⚠️ Please fill out all required fields correctly.');
      return;
    }

    setLoadingUser(true);
    setUserError(null);
    setUserResult(null);

    const payload = {
      loan_type: userData.loan_type,
      income: Number(userData.income),
      credit_score: Number(userData.credit_score),
      loan_amount: Number(userData.loan_amount),
      missed_payments: Number(userData.missed_payments),
    };

    try {
      let res;
      try {
        res = await api.post('/predict/user', payload);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Fallback to direct path if proxy routed to /user-risk
          res = await api.post('/user-risk', payload);
        } else {
          throw err;
        }
      }

      setUserResult(res.data);

      // Save to prediction history
      if (user && user.email) {
        const historyKey = `creditpath_history_${user.email}`;
        const prev = JSON.parse(localStorage.getItem(historyKey) || '[]');
        prev.push({
          type: 'user',
          loan_type: payload.loan_type,
          timestamp: new Date().toISOString(),
          amount: payload.loan_amount,
          risk: res.data.risk_level || 'Medium',
        });
        localStorage.setItem(historyKey, JSON.stringify(prev));
      }
    } catch (err) {
      console.error('User prediction failed:', err);
      setUserError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          '⚠️ Cannot reach backend. Make sure the backend service is running.'
      );
    } finally {
      setLoadingUser(false);
    }
  };

  const predictBank = async () => {
    if (!user) {
      setBankError('🔒 Please log in to your account to perform predictions.');
      return;
    }
    if (!validateBankForm()) {
      setBankError('⚠️ Please fill out all required fields correctly.');
      return;
    }

    setLoadingBank(true);
    setBankError(null);
    setBankResult(null);

    const payload = {
      loan_amount: Number(bankData.loan_amount),
      income: Number(bankData.income),
      Credit_Score: Number(bankData.Credit_Score),
      LTV: Number(bankData.LTV),
      dtir1: Number(bankData.dtir1),
    };

    try {
      let res;
      try {
        res = await api.post('/predict/bank', payload);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Fallback to /bank-risk if backend routes directly
          res = await api.post('/bank-risk', payload);
        } else {
          throw err;
        }
      }

      setBankResult(res.data);

      if (user && user.email) {
        const historyKey = `creditpath_history_${user.email}`;
        const prev = JSON.parse(localStorage.getItem(historyKey) || '[]');
        prev.push({
          type: 'bank',
          loan_type: 'commercial',
          timestamp: new Date().toISOString(),
          amount: payload.loan_amount,
          risk: res.data.loan_status || 'Underwriting',
        });
        localStorage.setItem(historyKey, JSON.stringify(prev));
      }
    } catch (err) {
      console.error('Bank prediction failed:', err);
      setBankError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          '⚠️ Cannot reach backend. Make sure the backend service is running.'
      );
    } finally {
      setLoadingBank(false);
    }
  };

  return (
    <div className="predict-page">
      <div className="predict-header">
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
          {type === 'user' ? '👤 User Risk Prediction' : '🏦 Bank Risk Analysis'}
        </h1>
        <p>
          {type === 'user'
            ? 'Enter your financial details to get your loan eligibility and personalised tips.'
            : 'Enter borrower details to estimate default probability and bank risk exposure.'}
        </p>
      </div>

      {type === 'user' ? (
        <div>
          <UserPredictForm
            formData={userData}
            errors={userValidationErrors}
            onChange={handleUserChange}
            onSubmit={predictUser}
            loading={loadingUser}
          />

          {userError && (
            <div className="error-box" style={{ marginTop: 20 }}>
              {userError}
            </div>
          )}

          {userResult && (
            <>
              <RiskScorecard type="user" result={userResult} inputData={userData} />
              <RiskCharts type="user" result={userResult} inputData={userData} />
            </>
          )}
        </div>
      ) : (
        <div>
          <BankPredictForm
            formData={bankData}
            errors={bankValidationErrors}
            onChange={handleBankChange}
            onSubmit={predictBank}
            loading={loadingBank}
          />

          {bankError && (
            <div className="error-box" style={{ marginTop: 20 }}>
              {bankError}
            </div>
          )}

          {bankResult && (
            <>
              <RiskScorecard type="bank" result={bankResult} inputData={bankData} />
              <RiskCharts type="bank" result={bankResult} inputData={bankData} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
