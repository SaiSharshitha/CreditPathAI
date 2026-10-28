from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

try:
    from ..database import get_db
    from ..models.db_models import User, UserRole
    from .security import (
        hash_password,
        verify_password,
        create_access_token,
        get_current_user,
    )
except ImportError:
    from database import get_db
    from models.db_models import User, UserRole
    from auth.security import (
        hash_password,
        verify_password,
        create_access_token,
        get_current_user,
    )

router = APIRouter()


class UserRegister(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: Optional[str] = "BORROWER"


class UserLogin(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def normalize_role(role_input: Optional[str]) -> UserRole:
    if not role_input:
        return UserRole.BORROWER
    cleaned = role_input.strip().upper().replace(" ", "_")
    if cleaned in ("ADMIN", "SYSTEM_ADMIN"):
        return UserRole.ADMIN
    if cleaned in ("BANK", "BANK_AGENT", "AGENT"):
        return UserRole.BANK_AGENT
    return UserRole.BORROWER


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    assigned_role = normalize_role(payload.role)
    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name or payload.email.split("@")[0].title(),
        role=assigned_role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": new_user.role.value if isinstance(new_user.role, UserRole) else str(new_user.role),
    })

    user_out = UserOut(
        id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role.value if isinstance(new_user.role, UserRole) else str(new_user.role),
        created_at=new_user.created_at,
    )
    return Token(access_token=token, token_type="bearer", user=user_out)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive a JWT."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_str = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": role_str,
    })

    user_out = UserOut(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=role_str,
        created_at=user.created_at,
    )
    return Token(access_token=token, token_type="bearer", user=user_out)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Fetch profile of current authenticated user."""
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value if isinstance(current_user.role, UserRole) else str(current_user.role),
        created_at=current_user.created_at,
    )
