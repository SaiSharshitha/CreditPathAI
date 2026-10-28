import csv
import io
import json
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import func

try:
    from ..database import get_db
    from ..models.db_models import User, PredictionRecord, FinancialGoal, UserRole
    from ..auth.security import get_current_user, require_roles
except ImportError:
    from database import get_db
    from models.db_models import User, PredictionRecord, FinancialGoal, UserRole
    from auth.security import get_current_user, require_roles

router = APIRouter()


# -------------------------------------------------------------
# Pydantic Schemas for Dashboard & Goals
# -------------------------------------------------------------
class GoalCreateSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    target_amount: float = Field(..., gt=0)
    saved_amount: float = Field(default=0.0, ge=0)


class GoalOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    target_amount: float
    saved_amount: float
    created_at: datetime


class PredictionRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    prediction_type: str
    loan_amount: float
    income: Optional[float] = None
    credit_score: Optional[float] = None
    risk_level: Optional[str] = None
    default_probability: Optional[float] = None
    expected_loss: Optional[float] = None
    input_payload: Optional[dict] = None
    result_payload: Optional[dict] = None
    created_at: datetime


# -------------------------------------------------------------
# User Dashboard Routes
# -------------------------------------------------------------
@router.get("/dashboard/history")
def get_user_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve prediction history for the authenticated user."""
    records = (
        db.query(PredictionRecord)
        .filter(PredictionRecord.user_id == current_user.id)
        .order_by(PredictionRecord.created_at.desc())
        .all()
    )

    history = []
    for r in records:
        history.append({
            "id": r.id,
            "prediction_type": r.prediction_type,
            "loan_amount": r.loan_amount,
            "income": r.income,
            "credit_score": r.credit_score,
            "risk_level": r.risk_level,
            "default_probability": r.default_probability,
            "expected_loss": r.expected_loss,
            "input_payload": json.loads(r.input_payload) if r.input_payload else None,
            "result_payload": json.loads(r.result_payload) if r.result_payload else None,
            "created_at": r.created_at,
        })
    return history


@router.delete("/dashboard/history")
def clear_user_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all prediction records for the authenticated user."""
    deleted_count = (
        db.query(PredictionRecord)
        .filter(PredictionRecord.user_id == current_user.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {
        "message": "Prediction history cleared successfully",
        "deleted_count": deleted_count,
    }


@router.get("/dashboard/goals")
def get_user_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch financial goals for the authenticated user."""
    goals = (
        db.query(FinancialGoal)
        .filter(FinancialGoal.user_id == current_user.id)
        .order_by(FinancialGoal.created_at.desc())
        .all()
    )
    return [
        {
            "id": g.id,
            "user_id": g.user_id,
            "title": g.title,
            "target_amount": g.target_amount,
            "saved_amount": g.saved_amount,
            "created_at": g.created_at,
        }
        for g in goals
    ]


@router.post("/dashboard/goals", status_code=status.HTTP_201_CREATED)
def create_user_goal(
    payload: GoalCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new financial goal."""
    goal = FinancialGoal(
        user_id=current_user.id,
        title=payload.title,
        target_amount=payload.target_amount,
        saved_amount=payload.saved_amount,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "title": goal.title,
        "target_amount": goal.target_amount,
        "saved_amount": goal.saved_amount,
        "created_at": goal.created_at,
    }


@router.delete("/dashboard/goals/{goal_id}")
def delete_user_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a user financial goal."""
    goal = (
        db.query(FinancialGoal)
        .filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial goal not found",
        )
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully", "id": goal_id}


# -------------------------------------------------------------
# Admin Protected Routes (Role: ADMIN)
# -------------------------------------------------------------
@router.get("/admin/metrics")
def get_admin_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """System-wide risk and utilization analytics for administrators."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_predictions = db.query(func.count(PredictionRecord.id)).scalar() or 0

    # Risk distribution
    risk_records = (
        db.query(PredictionRecord.risk_level, func.count(PredictionRecord.id))
        .group_by(PredictionRecord.risk_level)
        .all()
    )
    risk_distribution = {str(k or "Unspecified"): v for k, v in risk_records}

    # High-risk count
    high_risk_count = 0
    for level, count in risk_distribution.items():
        norm = level.lower()
        if "high" in norm or "reject" in norm:
            high_risk_count += count

    # Prediction types breakdown
    pred_types_records = (
        db.query(PredictionRecord.prediction_type, func.count(PredictionRecord.id))
        .group_by(PredictionRecord.prediction_type)
        .all()
    )
    prediction_types = {k: v for k, v in pred_types_records}

    # Role distribution
    roles_records = (
        db.query(User.role, func.count(User.id))
        .group_by(User.role)
        .all()
    )
    role_distribution = {
        (k.value if isinstance(k, UserRole) else str(k)): v
        for k, v in roles_records
    }

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "high_risk_count": high_risk_count,
        "risk_distribution": risk_distribution,
        "prediction_types": prediction_types,
        "role_distribution": role_distribution,
    }


@router.get("/admin/users")
def get_admin_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Retrieve full directory of system users."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value if isinstance(u.role, UserRole) else str(u.role),
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.get("/admin/history")
def get_admin_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Retrieve complete prediction log across all accounts."""
    records = (
        db.query(PredictionRecord, User.email)
        .outerjoin(User, PredictionRecord.user_id == User.id)
        .order_by(PredictionRecord.created_at.desc())
        .all()
    )
    items = []
    for r, email in records:
        items.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_email": email,
            "prediction_type": r.prediction_type,
            "loan_amount": r.loan_amount,
            "income": r.income,
            "credit_score": r.credit_score,
            "risk_level": r.risk_level,
            "default_probability": r.default_probability,
            "expected_loss": r.expected_loss,
            "input_payload": json.loads(r.input_payload) if r.input_payload else None,
            "result_payload": json.loads(r.result_payload) if r.result_payload else None,
            "created_at": r.created_at,
        })
    return items


def sanitize_csv_cell(value: Any) -> str:
    """
    Sanitize CSV value against CSV / Spreadsheet Formula Injection.
    Prepends a single quote if the field begins with =, +, -, @, \\t, or \\r.
    """
    if value is None:
        return ""
    s = str(value)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s


@router.get("/admin/export-csv")
def export_admin_csv(
    type: str = Query("history", pattern="^(history|users)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """
    Exports system records to a sanitized CSV file with formula injection mitigation.
    """
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    if type == "users":
        writer.writerow(["ID", "Email", "Full Name", "Role", "Created At"])
        users = db.query(User).order_by(User.created_at.desc()).all()
        for u in users:
            role_str = u.role.value if isinstance(u.role, UserRole) else str(u.role)
            writer.writerow([
                sanitize_csv_cell(u.id),
                sanitize_csv_cell(u.email),
                sanitize_csv_cell(u.full_name),
                sanitize_csv_cell(role_str),
                sanitize_csv_cell(u.created_at.isoformat() if u.created_at else ""),
            ])
    else:
        writer.writerow([
            "ID",
            "User ID",
            "User Email",
            "Prediction Type",
            "Loan Amount",
            "Income",
            "Credit Score",
            "Risk Level",
            "Default Probability",
            "Expected Loss",
            "Created At",
        ])
        records = (
            db.query(PredictionRecord, User.email)
            .outerjoin(User, PredictionRecord.user_id == User.id)
            .order_by(PredictionRecord.created_at.desc())
            .all()
        )
        for r, email in records:
            writer.writerow([
                sanitize_csv_cell(r.id),
                sanitize_csv_cell(r.user_id),
                sanitize_csv_cell(email),
                sanitize_csv_cell(r.prediction_type),
                sanitize_csv_cell(r.loan_amount),
                sanitize_csv_cell(r.income),
                sanitize_csv_cell(r.credit_score),
                sanitize_csv_cell(r.risk_level),
                sanitize_csv_cell(r.default_probability),
                sanitize_csv_cell(r.expected_loss),
                sanitize_csv_cell(r.created_at.isoformat() if r.created_at else ""),
            ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="creditpath_{type}_{datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")}.csv"'
        },
    )
