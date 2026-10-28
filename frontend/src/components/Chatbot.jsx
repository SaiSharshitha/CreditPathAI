import React, { useState, useRef, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';

const PRESET_ANSWERS = {
  // Project Specific - A to Z
  'what is creditpath':
    'CreditPath AI is an advanced financial tool that uses machine learning to predict loan approval chances and provides actionable financial insights for both borrowers and banks.',
  'how does creditpath work':
    'Borrowers provide their financial details to get a risk assessment. Banks use it to analyze borrower data, predict default probabilities, and get recovery recommendations.',
  'who uses creditpath':
    "It's designed for both retail borrowers (to check loan eligibility) and bank analysts (to assess borrower risk and minimize loan defaults).",

  // User / Borrower Questions
  'what is dti':
    'DTI (Debt-to-Income Ratio) compares your monthly debt payments to your gross monthly income. A lower DTI (usually under 36-40%) is preferable for loan approval.',
  'what is ltv':
    'LTV (Loan-to-Value) is the ratio of the loan amount to the value of the asset purchased. Banks prefer an LTV of 80% or lower.',
  'how to improve score':
    'To improve your credit score: Pay EMIs on time, keep credit card utilization below 30%, and avoid applying for multiple new loans in a short time.',
  'how to improve credit':
    'To improve your score: Pay EMIs on time, keep credit card utilization below 30%, and avoid applying for too many loans in a short time.',
  'is my data safe':
    "Yes! Your data is transmitted securely and analyzed through isolated financial scoring models.",
  'what is credit score':
    'A credit score is a 3-digit number (usually 300 to 900) representing your creditworthiness. A score above 750 is considered excellent and gets you better interest rates.',
  'what is emi':
    "EMI stands for Equated Monthly Installment. It's the fixed amount you pay to the bank every month to clear your loan.",
  'what is collateral':
    'Collateral is an asset (like a house or car) that you pledge to a lender to secure a loan. If you default, the lender can seize it.',
  'loan rate':
    'Loan interest rates depend heavily on your credit score and the current market. Generally, home loans range from 8-10% while personal loans are 10-15%+.',
  'default risk':
    'Default risk is the probability that a borrower will be unable to make their required payments on their debt obligations.',

  // Bank / Analyst Questions
  'how to assess risk':
    "To assess risk, enter the borrower's loan amount, income, credit score, LTV, and DTI. CreditPath's machine learning model will calculate the expected loss and default probability.",
  'what is expected loss':
    'Expected Loss is a financial metric used by banks. It is calculated as Probability of Default (PD) × Exposure at Default (EAD) × Loss Given Default (LGD).',
  'how does the bank engine work':
    'The bank engine uses an LGBM (Light Gradient Boosting Machine) model trained on historical data to predict if a borrower will default, and recommends the next best action.',
  'what is recovery channel':
    'If a loan is flagged as high risk, CreditPath recommends a recovery channel (e.g., Email, Phone Call, or Field Visit) to minimize potential losses.',
  'conditionally approved':
    'Conditionally Approved means the borrower has medium risk. The bank may require additional collateral, a co-signer, or a higher interest rate.',
  'high risk customer':
    'For high-risk customers, the system flags the expected loss. It is recommended to reject the application or require strict collateral and utilize high-priority recovery channels like Field Visits.',

  // Greetings & Pleasantries
  'hello':
    "Hello! I'm Pathy, your CreditPath AI assistant. You can ask me to 'predict risk' or learn about financial terms.",
  'hi': "Hi there! Ready to analyze some credit risk? Ask me to 'predict user risk' or 'predict bank risk'.",
  'hey': 'Hey! How can I assist you with your financial questions?',
  'thank you': "You're very welcome! Feel free to ask if you need anything else.",
  'thanks': 'Happy to help! Let me know if you have any other questions.',
  'bye': 'Goodbye! Have a great day and stay financially healthy!',
  'help':
    "I can explain financial concepts and even predict risk! Try 'What is DTI?' or 'Predict bank risk: amount 200000, income 50000, score 720, ltv 80, dti 30'.",
};

export default function Chatbot() {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "👋 Hi! I'm Pathy, your CreditPath AI Assistant. Ask me anything about credit scores, banking terms, or tell me to 'predict risk'!",
      isBot: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { text: userMsg, isBot: false }]);
    setInput('');
    setIsTyping(true);

    const lower = userMsg.toLowerCase();

    // 1. Check for prediction intent
    if (
      lower.includes('predict') &&
      (lower.includes('risk') || lower.includes('loan') || lower.includes('bank') || lower.includes('user'))
    ) {
      if (!user) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            text: '🔒 Secure Feature: Please log in to your account first to run risk predictions.',
            isBot: true,
          },
        ]);
        return;
      }

      if (lower.includes('bank')) {
        const amountMatch = lower.match(/(?:amount|loan)[:\s]*(\d+)/);
        const incomeMatch = lower.match(/income[:\s]*(\d+)/);
        const scoreMatch = lower.match(/score[:\s]*(\d+)/);
        const ltvMatch = lower.match(/(?:ltv|value)[:\s]*(\d+)/);
        const dtiMatch = lower.match(/(?:dti|dtir|ratio)[:\s]*(\d+)/);

        if (amountMatch && incomeMatch && scoreMatch && ltvMatch && dtiMatch) {
          const bankData = {
            loan_amount: parseFloat(amountMatch[1]),
            income: parseFloat(incomeMatch[1]),
            Credit_Score: parseFloat(scoreMatch[1]),
            LTV: parseFloat(ltvMatch[1]),
            dtir1: parseFloat(dtiMatch[1]),
          };

          try {
            let res;
            try {
              res = await api.post('/predict/bank', bankData);
            } catch (err) {
              if (err.response && err.response.status === 404) {
                res = await api.post('/bank-risk', bankData);
              } else {
                throw err;
              }
            }

            const data = res.data;
            const defProb = typeof data.default_probability === 'number' ? data.default_probability : 0.15;
            const loss = data.expected_loss != null ? data.expected_loss : Math.round(bankData.loan_amount * defProb * 0.45);
            const decision = data.bank_decision || {};

            const reply = `🏦 Bank Risk Prediction Result:\n\n• Status: ${data.loan_status || 'Underwriting'}\n• Default Probability: ${(defProb * 100).toFixed(1)}%\n• Expected Loss: ₹${loss.toLocaleString('en-IN')}\n• Priority: ${decision.priority || 'Medium'}\n• Recovery Channel: ${decision.recovery_channel || 'Email + SMS'}`;
            setMessages((prev) => [...prev, { text: reply, isBot: true }]);
          } catch (err) {
            setMessages((prev) => [
              ...prev,
              {
                text: "❌ Sorry, I couldn't reach the risk prediction service. Please ensure the backend is running.",
                isBot: true,
              },
            ]);
          } finally {
            setIsTyping(false);
          }
          return;
        } else {
          setIsTyping(false);
          const reply =
            "To predict Bank Risk, please provide: amount, income, score, ltv, and dti.\n\nExample:\n'Predict bank risk: amount 200000, income 50000, score 720, ltv 80, dti 30'";
          setMessages((prev) => [...prev, { text: reply, isBot: true }]);
          return;
        }
      } else {
        // User Risk
        const typeMatch = lower.match(/(?:type|loan type)[:\s]*([a-z]+)/);
        const incomeMatch = lower.match(/income[:\s]*(\d+)/);
        const scoreMatch = lower.match(/score[:\s]*(\d+)/);
        const amountMatch = lower.match(/(?:amount|loan)[:\s]*(\d+)/);
        const missedMatch = lower.match(/(?:missed|payments)[:\s]*(\d+)/);

        if (incomeMatch && scoreMatch && amountMatch && missedMatch) {
          const userData = {
            loan_type: typeMatch ? typeMatch[1] : 'personal',
            income: parseFloat(incomeMatch[1]),
            credit_score: parseFloat(scoreMatch[1]),
            loan_amount: parseFloat(amountMatch[1]),
            missed_payments: parseInt(missedMatch[1], 10),
          };

          try {
            let res;
            try {
              res = await api.post('/predict/user', userData);
            } catch (err) {
              if (err.response && err.response.status === 404) {
                res = await api.post('/user-risk', userData);
              } else {
                throw err;
              }
            }

            const data = res.data;
            const advice = data.recommendation_summary?.[0] || 'Maintain healthy credit habits.';
            const topTip = data.tips?.[0] || 'Keep credit card balances low.';

            const reply = `👤 User Risk Prediction Result:\n\n• Risk Level: ${data.risk_level}\n• Advice: ${advice}\n• Top Tip: ${topTip}`;
            setMessages((prev) => [...prev, { text: reply, isBot: true }]);
          } catch (err) {
            setMessages((prev) => [
              ...prev,
              {
                text: "❌ Sorry, I couldn't reach the user risk prediction service at the moment.",
                isBot: true,
              },
            ]);
          } finally {
            setIsTyping(false);
          }
          return;
        } else {
          setIsTyping(false);
          const reply =
            "To predict User Risk, please provide: type, income, score, amount, and missed.\n\nExample:\n'Predict risk: type home, income 800000, score 740, amount 3000000, missed 0'";
          setMessages((prev) => [...prev, { text: reply, isBot: true }]);
          return;
        }
      }
    }

    // 2. Preset / FAQ matching
    setTimeout(() => {
      let reply =
        "I'm not quite sure about that. Try asking 'What is DTI?', 'How does CreditPath work?', or you can type 'Predict bank risk: amount 200000, income 50000, score 720, ltv 80, dti 30' to get real-time calculations.";

      for (const key in PRESET_ANSWERS) {
        if (lower.includes(key)) {
          reply = PRESET_ANSWERS[key];
          break;
        }
      }

      setIsTyping(false);
      setMessages((prev) => [...prev, { text: reply, isBot: true }]);
    }, 400);
  };

  return (
    <>
      {/* Floating Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Chatbot"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen);
        }}
        style={{
          position: 'fixed',
          bottom: 30,
          right: 30,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? '✕' : '💬'}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 100,
            right: 30,
            width: 380,
            maxWidth: 'calc(100vw - 40px)',
            height: 500,
            borderRadius: 16,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--accent)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Pathy Assistant AI</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Online • Real-time Financial Q&A</div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.2rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: 16,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                  background: msg.isBot ? 'var(--bg-secondary)' : 'var(--accent)',
                  color: msg.isBot ? 'var(--text-primary)' : 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 16px',
                  borderRadius: 14,
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                }}
              >
                Pathy is typing…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message or financial question..."
              style={{
                flex: 1,
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '10px 16px',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isTyping}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              ➜
            </button>
          </form>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
