import json
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from ..database import get_db
    from ..models.db_models import User, PredictionRecord, UserRole
    from ..auth.security import get_optional_current_user, require_roles
    from ..services.ml_engine import (
        bank_engine,
        user_engine,
        BankInputSchema,
        UserInputSchema,
    )
except ImportError:
    from database import get_db
    from models.db_models import User, PredictionRecord, UserRole
    from auth.security import get_optional_current_user, require_roles
    from services.ml_engine import (
        bank_engine,
        user_engine,
        BankInputSchema,
        UserInputSchema,
    )

router = APIRouter()


@router.post("/predict/user")
@router.post("/user-risk", include_in_schema=False)
def predict_user_risk(
    payload: UserInputSchema,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Evaluates multi-factor risk for borrower applications.
    If authenticated, automatically persists prediction to the user's history.
    """
    result = user_engine(payload)

    if current_user:
        record = PredictionRecord(
            user_id=current_user.id,
            prediction_type="user",
            loan_amount=payload.loan_amount,
            income=payload.income,
            credit_score=payload.credit_score,
            risk_level=result.get("risk_level"),
            default_probability=None,
            expected_loss=None,
            input_payload=json.dumps(payload.model_dump()),
            result_payload=json.dumps(result),
        )
        db.add(record)
        db.commit()

    return result


@router.post("/predict/bank")
@router.post("/bank-risk", include_in_schema=False)
def predict_bank_risk(
    payload: BankInputSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.BANK_AGENT, UserRole.ADMIN])),
):
    """
    Executes institutional risk underwriting scorecard and Basel II expected loss model.
    Restricted to BANK_AGENT and ADMIN roles.
    """
    result = bank_engine(payload)

    record = PredictionRecord(
        user_id=current_user.id,
        prediction_type="bank",
        loan_amount=payload.loan_amount,
        income=payload.income,
        credit_score=payload.Credit_Score,
        risk_level=result.get("loan_status"),
        default_probability=result.get("default_probability"),
        expected_loss=result.get("expected_loss"),
        input_payload=json.dumps(payload.model_dump()),
        result_payload=json.dumps(result),
    )
    db.add(record)
    db.commit()

    return result
