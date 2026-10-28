import sys
from pathlib import Path

# Add project root to sys.path so 'backend' is importable from anywhere
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.database import Base, get_db
from backend.models.db_models import User, UserRole
from backend.auth.security import hash_password, create_access_token
from backend.app import app

# In-memory SQLite with StaticPool so all connections share the same memory instance
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def clean_and_seed_db():
    """Ensure clean tables and fresh demo accounts before each test."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    demo_users = [
        User(
            email="admin@creditpath.ai",
            hashed_password=hash_password("CreditPath@2026"),
            full_name="System Admin",
            role=UserRole.ADMIN,
        ),
        User(
            email="agent@creditpath.ai",
            hashed_password=hash_password("CreditPath@2026"),
            full_name="Bank Officer",
            role=UserRole.BANK_AGENT,
        ),
        User(
            email="borrower@creditpath.ai",
            hashed_password=hash_password("CreditPath@2026"),
            full_name="Alex Borrower",
            role=UserRole.BORROWER,
        ),
    ]
    for u in demo_users:
        db.add(u)
    db.commit()
    db.close()
    yield


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def admin_headers(db_session):
    user = db_session.query(User).filter(User.email == "admin@creditpath.ai").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": "ADMIN"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def agent_headers(db_session):
    user = db_session.query(User).filter(User.email == "agent@creditpath.ai").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": "BANK_AGENT"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def borrower_headers(db_session):
    user = db_session.query(User).filter(User.email == "borrower@creditpath.ai").first()
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": "BORROWER"})
    return {"Authorization": f"Bearer {token}"}
