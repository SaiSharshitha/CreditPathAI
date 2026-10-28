import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

try:
    from .database import engine, SessionLocal, Base
    from .models.db_models import User, UserRole
    from .auth.security import hash_password
    from .auth.routes import router as auth_router
    from .routes.predict import router as predict_router
    from .routes.dashboard import router as dashboard_router
    from .services.ml_engine import (
        bank_engine,
        user_engine,
        BankInputSchema,
        UserInputSchema,
    )
except ImportError:
    from database import engine, SessionLocal, Base
    from models.db_models import User, UserRole
    from auth.security import hash_password
    from auth.routes import router as auth_router
    from routes.predict import router as predict_router
    from routes.dashboard import router as dashboard_router
    from services.ml_engine import (
        bank_engine,
        user_engine,
        BankInputSchema,
        UserInputSchema,
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("creditpath.api")

DEMO_ACCOUNTS = [
    {
        "email": "admin@creditpath.ai",
        "password": "CreditPath@2026",
        "full_name": "System Administrator",
        "role": UserRole.ADMIN,
    },
    {
        "email": "agent@creditpath.ai",
        "password": "CreditPath@2026",
        "full_name": "Bank Underwriting Officer",
        "role": UserRole.BANK_AGENT,
    },
    {
        "email": "borrower@creditpath.ai",
        "password": "CreditPath@2026",
        "full_name": "Alex Borrower",
        "role": UserRole.BORROWER,
    },
]


def seed_demo_accounts(db: Session):
    """Seed initial demo accounts if they do not exist."""
    for account in DEMO_ACCOUNTS:
        existing = db.query(User).filter(User.email == account["email"]).first()
        if not existing:
            user = User(
                email=account["email"],
                hashed_password=hash_password(account["password"]),
                full_name=account["full_name"],
                role=account["role"],
            )
            db.add(user)
            logger.info(f"Seeded demo account: {account['email']} ({account['role'].value})")
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Seed demo credentials
    db = SessionLocal()
    try:
        seed_demo_accounts(db)
    finally:
        db.close()

    yield
    logger.info("CreditPath AI API shutdown complete.")


app = FastAPI(
    title="CreditPath AI API",
    description="Enterprise Credit Risk Assessment, Basel II Underwriting & Financial Intelligence Engine",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# MOUNT API ROUTERS
# -------------------------------
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(predict_router, prefix="/api", tags=["Predictions"])
app.include_router(dashboard_router, prefix="/api", tags=["Dashboard & Administration"])


# -------------------------------
# ROOT & LEGACY BACKWARD COMPATIBILITY
# -------------------------------
@app.get("/")
def home():
    return {
        "service": "CreditPath AI Enterprise API",
        "status": "healthy",
        "version": "2.0.0",
        "documentation": "/docs",
        "routes": {
            "auth": "/api/auth",
            "predict_user": "/api/predict/user",
            "predict_bank": "/api/predict/bank",
            "dashboard": "/api/dashboard",
            "admin": "/api/admin",
        },
    }


@app.post("/bank-risk", tags=["Legacy Compatibility"], include_in_schema=False)
def legacy_bank_risk(data: BankInputSchema):
    """Legacy unauthenticated bank endpoint for test/demo backward compatibility."""
    return bank_engine(data)


@app.post("/user-risk", tags=["Legacy Compatibility"], include_in_schema=False)
def legacy_user_risk(data: UserInputSchema):
    """Legacy unauthenticated user endpoint for test/demo backward compatibility."""
    return user_engine(data)
