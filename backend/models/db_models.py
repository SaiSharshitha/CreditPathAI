import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship

try:
    from ..database import Base
except ImportError:
    from database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    BORROWER = "BORROWER"
    BANK_AGENT = "BANK_AGENT"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(
        SQLEnum(UserRole, native_enum=False, length=32),
        default=UserRole.BORROWER,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    predictions = relationship(
        "PredictionRecord",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(PredictionRecord.created_at)",
    )
    goals = relationship(
        "FinancialGoal",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(FinancialGoal.created_at)",
    )


class PredictionRecord(Base):
    __tablename__ = "prediction_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    prediction_type = Column(String(32), nullable=False, index=True)  # 'user' or 'bank'
    loan_amount = Column(Float, nullable=False)
    income = Column(Float, nullable=True)
    credit_score = Column(Float, nullable=True)
    risk_level = Column(String(64), nullable=True, index=True)
    default_probability = Column(Float, nullable=True)
    expected_loss = Column(Float, nullable=True)
    input_payload = Column(Text, nullable=True)
    result_payload = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="predictions")


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    target_amount = Column(Float, nullable=False)
    saved_amount = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="goals")
