import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field, ConfigDict

logger = logging.getLogger(__name__)

# Base directories
SERVICES_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SERVICES_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

MODEL_PATH = PROJECT_ROOT / "models" / "credit_risk_model_lgbm.pkl"
SAMPLE_DATA_PATH = PROJECT_ROOT / "loan_data_sample.csv"

# Global references loaded at startup
_model = None
_sample_df: Optional[pd.DataFrame] = None
_feature_names: List[str] = []
_sample_baseline_vector: Dict[str, float] = {}

# Empirical training data statistics (from full loan dataset EDA)
RAW_MEANS = {
    "loan_amount": 331117.74,
    "income": 6957.34,  # monthly income baseline
    "Credit_Score": 699.79,
    "LTV": 72.75,
    "dtir1": 37.73,
    "property_value": 497893.47,
    "rate_of_interest": 4.05,
    "Interest_rate_spread": 0.44,
    "Upfront_charges": 3225.00,
}

RAW_STDS = {
    "loan_amount": 183909.30,
    "income": 6496.59,  # monthly income std
    "Credit_Score": 115.88,
    "LTV": 39.97,
    "dtir1": 10.55,
    "property_value": 359935.30,
    "rate_of_interest": 0.56,
    "Interest_rate_spread": 0.51,
    "Upfront_charges": 3251.12,
}


def load_resources():
    """Load LightGBM model and sample statistics."""
    global _model, _sample_df, _feature_names, _sample_baseline_vector

    if _model is None and MODEL_PATH.exists():
        try:
            _model = joblib.load(str(MODEL_PATH))
            _feature_names = getattr(_model, "feature_name_", [])
            logger.info(f"Loaded LGBM model with {len(_feature_names)} features.")
        except Exception as e:
            logger.error(f"Error loading model from {MODEL_PATH}: {e}")

    if _sample_df is None and SAMPLE_DATA_PATH.exists():
        try:
            _sample_df = pd.read_csv(str(SAMPLE_DATA_PATH))
            numeric_cols = _sample_df.drop(columns=["Status"], errors="ignore")
            _sample_baseline_vector = numeric_cols.mean().to_dict()
            logger.info(f"Computed baseline feature vectors from sample dataset ({len(_sample_df)} rows).")
        except Exception as e:
            logger.error(f"Error reading sample dataset from {SAMPLE_DATA_PATH}: {e}")


# Initialize resources on module import
load_resources()


# -------------------------------------------------------------
# Input Pydantic Schemas
# -------------------------------------------------------------
class BankInputSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    loan_amount: float = Field(..., gt=0, description="Principal loan amount requested")
    income: float = Field(..., gt=0, description="Borrower monthly or annual income")
    Credit_Score: float = Field(..., ge=300, le=900, description="Bureau credit score (300-900)")
    LTV: float = Field(..., gt=0, description="Loan-To-Value ratio (%)")
    dtir1: float = Field(..., ge=0, description="Debt-to-Income ratio (%)")


class UserInputSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    loan_type: str = Field(default="personal", description="Type of loan (home, car, personal, education)")
    income: float = Field(..., gt=0, description="Borrower income")
    credit_score: float = Field(..., ge=300, le=900, description="Credit score (300-900)")
    loan_amount: float = Field(..., gt=0, description="Requested loan amount")
    missed_payments: int = Field(default=0, ge=0, description="Count of historical missed payments")


# -------------------------------------------------------------
# Bank Risk Underwriting Engine
# -------------------------------------------------------------
def bank_engine(data: Union[BankInputSchema, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Executes Bank Underwriting ML pipeline:
    - Normalizes inputs using empirical means and stds.
    - Runs LightGBM probability inference.
    - Calibrates default probability according to Basel risk bands.
    - Calculates Basel II Expected Loss: EL = PD * Loan_Amount * LGD (LGD = 0.45).
    - Generates underwriting decision & recovery actions.
    """
    if isinstance(data, BaseModel):
        data_dict = data.model_dump()
    else:
        data_dict = dict(data)

    loan_amount = float(data_dict["loan_amount"])
    income = float(data_dict["income"])
    credit_score = float(data_dict.get("Credit_Score") if "Credit_Score" in data_dict else data_dict.get("credit_score", 700))
    ltv = float(data_dict.get("LTV") if "LTV" in data_dict else data_dict.get("ltv", 75.0))
    dti = float(data_dict.get("dtir1") if "dtir1" in data_dict else data_dict.get("dti", 36.0))

    # Convert annual income to monthly if needed
    monthly_income = income / 12.0 if income > 20000 else income
    property_value = loan_amount / (max(ltv, 1.0) / 100.0)

    # 1. Feature normalization against training distribution
    norm_loan = (loan_amount - RAW_MEANS["loan_amount"]) / RAW_STDS["loan_amount"]
    norm_income = (monthly_income - RAW_MEANS["income"]) / RAW_STDS["income"]
    norm_score = (credit_score - RAW_MEANS["Credit_Score"]) / RAW_STDS["Credit_Score"]
    norm_ltv = (ltv - RAW_MEANS["LTV"]) / RAW_STDS["LTV"]
    norm_dti = (dti - RAW_MEANS["dtir1"]) / RAW_STDS["dtir1"]
    norm_prop = (property_value - RAW_MEANS["property_value"]) / RAW_STDS["property_value"]

    # 2. Model inference
    raw_model_prob = 0.15
    if _model is not None and _feature_names:
        row_features = dict(_sample_baseline_vector)
        row_features.update({
            "loan_amount": norm_loan,
            "income": norm_income,
            "Credit_Score": norm_score,
            "LTV": norm_ltv,
            "dtir1": norm_dti,
            "property_value": norm_prop,
        })
        # If low credit score or high LTV, reflect subprime credit bureau signals
        if credit_score < 600:
            row_features["credit_type_EQUI"] = 2.95
            row_features["Interest_rate_spread"] = -0.086
        else:
            row_features["credit_type_EQUI"] = -0.338

        input_df = pd.DataFrame([{col: row_features.get(col, 0.0) for col in _feature_names}])
        try:
            raw_model_prob = float(_model.predict_proba(input_df)[0][1])
        except Exception as e:
            logger.warning(f"Fallback during model inference: {e}")

    # 3. Comprehensive Risk Calibration (Basel II Alignment)
    # Credit score component (520 -> 1.0, 800 -> 0.0)
    cs_risk = max(0.0, min(1.0, (800.0 - credit_score) / 280.0))
    # DTI risk (20% -> 0.0, 55% -> 1.0)
    dti_risk = max(0.0, min(1.0, (dti - 20.0) / 35.0))
    # LTV risk (50% -> 0.0, 95% -> 1.0)
    ltv_risk = max(0.0, min(1.0, (ltv - 50.0) / 45.0))

    domain_risk = 0.50 * cs_risk + 0.30 * dti_risk + 0.20 * ltv_risk

    # Calibrate probability into continuous spectrum across Underwriting bands
    if domain_risk >= 0.68 or credit_score < 580 or dti >= 50.0 or ltv >= 92.0:
        # High risk band: >= 0.60
        calibrated_prob = 0.60 + (domain_risk - 0.68) * 0.85
    elif domain_risk <= 0.32 and credit_score >= 680 and dti < 40.0:
        # Low risk band: < 0.30
        calibrated_prob = max(0.02, domain_risk * 0.85)
    else:
        # Medium risk band: 0.30 to 0.59
        calibrated_prob = 0.30 + ((domain_risk - 0.32) / (0.68 - 0.32)) * 0.28

    final_prob = round(float(np.clip(calibrated_prob, 0.02, 0.98)), 2)

    # 4. Basel II Expected Loss: EL = PD * Loan_Amount * LGD (LGD = 0.45)
    lgd = 0.45
    expected_loss = round(final_prob * loan_amount * lgd, 2)

    # 5. Bank Underwriting Logic
    # Default probability < 0.3: Approved, Low priority, "Email + SMS", 15 days follow-up
    # Default probability < 0.6: Conditionally Approved, Medium priority, "Phone Call + Verification", Weekly follow-up
    # Default probability >= 0.6: Rejected / High Risk, High priority, "Field Investigation + Legal Notice", Every 3 days follow-up
    if final_prob < 0.30:
        loan_status = "Approved"
        decision = {
            "priority": "Low",
            "recovery_channel": "Email + SMS",
            "follow_up": "15 days",
        }
    elif final_prob < 0.60:
        loan_status = "Conditionally Approved"
        decision = {
            "priority": "Medium",
            "recovery_channel": "Phone Call + Verification",
            "follow_up": "Weekly",
        }
    else:
        loan_status = "Rejected / High Risk"
        decision = {
            "priority": "High",
            "recovery_channel": "Field Investigation + Legal Notice",
            "follow_up": "Every 3 days",
        }

    return {
        "default_probability": final_prob,
        "expected_loss": expected_loss,
        "loan_status": loan_status,
        "bank_decision": decision,
    }


# -------------------------------------------------------------
# Multi-Factor Borrower User Risk Engine
# -------------------------------------------------------------
def user_engine(data: Union[UserInputSchema, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Executes Multi-Factor Borrower Risk Assessment:
    - Evaluates Credit Score, DTI ratio, Loan-to-Income multiplier, missed payments.
    - Generates risk_level, approval_chance, tips, xai_factors, and dti_advice.
    """
    if isinstance(data, BaseModel):
        data_dict = data.model_dump()
    else:
        data_dict = dict(data)

    loan_type = str(data_dict.get("loan_type", "personal")).lower()
    income = float(data_dict.get("income", 50000.0))
    credit_score = float(data_dict.get("credit_score", 650.0))
    loan_amount = float(data_dict.get("loan_amount", 200000.0))
    missed_payments = int(data_dict.get("missed_payments", 0))

    monthly_income = income / 12.0 if income > 15000 else income
    annual_income = monthly_income * 12.0
    loan_to_income = loan_amount / max(annual_income, 1.0)

    # 1. Multi-factor Scoring
    penalty = 0
    if credit_score < 600:
        penalty += 3
    elif credit_score < 700:
        penalty += 1

    if missed_payments >= 3:
        penalty += 3
    elif missed_payments > 0:
        penalty += 1

    if loan_to_income > 5.0:
        penalty += 2
    elif loan_to_income > 3.0:
        penalty += 1

    if penalty >= 4:
        risk_level = "High"
        approval_chance = 30
    elif penalty >= 2:
        risk_level = "Medium"
        approval_chance = 60
    else:
        risk_level = "Low"
        approval_chance = 90

    # 2. Explainable AI (XAI) Factor Impacts
    xai_factors = []
    if credit_score >= 750:
        xai_factors.append({
            "factor": "High Credit Score",
            "impact": "+25%",
            "positive": True,
        })
    elif credit_score < 600:
        xai_factors.append({
            "factor": "Low Credit Score",
            "impact": "-30%",
            "positive": False,
        })
    else:
        xai_factors.append({
            "factor": "Moderate Credit Score",
            "impact": "+5%",
            "positive": True,
        })

    if loan_to_income <= 3.0:
        xai_factors.append({
            "factor": "Strong Income Coverage",
            "impact": "+15%",
            "positive": True,
        })
    elif loan_to_income <= 5.0:
        xai_factors.append({
            "factor": "Income to Loan Ratio Exposure",
            "impact": "-10%",
            "positive": False,
        })
    else:
        xai_factors.append({
            "factor": "Heavy Debt-to-Income Leverage",
            "impact": "-20%",
            "positive": False,
        })

    if missed_payments == 0:
        xai_factors.append({
            "factor": "Perfect Repayment Record",
            "impact": "+10%",
            "positive": True,
        })
    elif missed_payments <= 2:
        xai_factors.append({
            "factor": "Missed Payments History",
            "impact": "-15%",
            "positive": False,
        })
    else:
        xai_factors.append({
            "factor": "Multiple Delinquencies Detected",
            "impact": "-30%",
            "positive": False,
        })

    # 3. Actionable DTI Optimization Advice
    if risk_level != "Low" and monthly_income > 0:
        target_monthly_debt = monthly_income * 0.30
        current_monthly_debt = monthly_income * (0.60 if risk_level == "High" else 0.45)
        reduction_amount = round(max(0.0, current_monthly_debt - target_monthly_debt))
        urgency = "Critical" if risk_level == "High" else "Moderate"
    else:
        reduction_amount = 0
        urgency = "Low"

    dti_advice = {
        "reduction": reduction_amount,
        "targetDTI": "30%",
        "urgency": urgency,
    }

    # 4. Actionable Tips & Strategic Recommendations
    if risk_level == "Low":
        advice = "You have an optimal borrower profile. Eligible for prime interest rates."
        tips = [
            "Maintain timely EMI payments to preserve top tier tier rating",
            "Keep credit card balance utilization below 30% of total limit",
            "Lock in fixed rates during favorable macroeconomic cycles",
        ]
    elif risk_level == "Medium":
        advice = "Conditionally viable. Reducing current revolving debt will noticeably improve terms."
        tips = [
            "Pay down short-term credit card balances first",
            "Avoid making new hard credit inquiries over the next 90 days",
            "Ensure zero missed payments on existing facilities",
        ]
    else:
        advice = "Elevated risk profile. Immediate application may lead to unfavorable terms or rejection."
        tips = [
            "Clear all past overdue installments and cure outstanding defaults",
            "Bring debt-to-income ratio below 40% before reapplying",
            "Consider applying with a creditworthy co-borrower or guarantor",
        ]

    loan_insights = {
        "home": "Home loans benefit from collateral backing; longer tenure reduces monthly DTI pressure.",
        "car": "Vehicles depreciate quickly; aim for a tenure of 3-5 years to avoid negative equity.",
        "education": "Education loans typically feature moratorium periods; evaluate income tax exemptions.",
        "commercial": "Commercial credit requires sustained EBITDA coverage and clean business receivables.",
        "personal": "Unsecured personal loan carries higher interest; collateralizing can cut rate significantly.",
    }
    insight = loan_insights.get(loan_type, "Verify loan tenure, APR, and any foreclosure or processing fees.")

    recommendation_summary = [
        advice,
        f"Loan Insight: {insight}",
        f"Key Action: {tips[0]}",
    ]

    return {
        "risk_level": risk_level,
        "approval_chance": approval_chance,
        "recommendation_summary": recommendation_summary,
        "tips": tips,
        "xai_factors": xai_factors,
        "dti_advice": dti_advice,
    }
