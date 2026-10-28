# Pull Request: Comprehensive Architecture Refactor & Security Hardening

## Overview
This pull request transitions **CreditPath AI** from a prototype state into a production-ready Credit Risk Assessment and Decision Support Platform.

The updates address critical security vulnerabilities, resolve a machine learning feature-scaling distribution mismatch, introduce SQLite relational persistence with JWT authentication and Role-Based Access Control (RBAC), and modernize the frontend to **Vite + React 19** with responsive Recharts visualizations, while preserving the existing visual identity, layout, and styling.

---

## Technical Summary: Architecture and Design Changes

| Area | Previous Implementation | Updated Implementation |
| :--- | :--- | :--- |
| **Authentication & Passwords** | Hardcoded credentials (`admin@creditpath.com` / `admin123`); plaintext credentials stored in client `localStorage`. | Salted **`bcrypt` password hashing** (12 rounds) with signed **OAuth2 JWT bearer tokens** (PyJWT). |
| **Authorization (RBAC)** | Client-side self-assigned roles without server verification. | Server-side role enforcement (`BORROWER`, `BANK_AGENT`, `ADMIN`); unauthorized actions return `403 Forbidden`. |
| **Data Persistence** | No server persistence; data saved exclusively to the active browser session in `localStorage`. | Relational **SQLite persistence (`creditpath.db`)** via **SQLAlchemy 2.0 ORM** with automated schema initialization. |
| **ML Inference Pipeline** | Raw production inputs passed unscaled to normalized LightGBM trees; 31 of 36 features defaulted to `0`. | **Empirical Normalizer** standardizes inputs using reference distributions from `loan_data_sample.csv` prior to prediction. |
| **Loss Quantification** | Arbitrary client-side calculation; frontend bypassed backend decision fields. | Formal **Basel II Expected Loss framework** ($EL = PD \times EAD \times LGD$, where $LGD = 0.45$). Frontend binds directly to API contract. |
| **Frontend Tooling** | Deprecated Create React App (`react-scripts 5.0.1`) with 63 dependency vulnerabilities. | **Vite + React 19** toolchain with zero vulnerabilities, sub-second HMR, and optimized production chunking. |
| **Visualization** | Monolithic `plotly.js` bundle (>3.5 MB minified). | Native **Recharts** charts matching the visual palette, achieving an 80% bundle size reduction. |
| **Code Modularity** | 679-line monolithic `Predict.js` combining forms, charts, heuristics, and state. | Modular structure: `UserPredictForm`, `BankPredictForm`, `RiskScorecard`, and `RiskCharts`. |
| **Automated Testing** | Single failing CRA boilerplate test; zero backend test coverage. | **26 automated tests (100% pass rate)**: 16 Pytest tests and 10 Vitest tests. |

---

## Commits Included

This pull request consists of 5 self-contained commits structured in accordance with the Conventional Commits specification:

1. `feat(backend): implement SQLite persistence, bcrypt hashing, and JWT RBAC`
   - Configured SQLAlchemy 2.0 database engine with `User`, `PredictionRecord`, and `FinancialGoal` models.
   - Implemented bcrypt password hashing, PyJWT tokens, and role-based access security dependencies.
2. `fix(ml): resolve feature normalization mismatch and implement Basel II Expected Loss`
   - Added empirical baseline preprocessor to map raw borrower inputs to standardized feature space.
   - Implemented regulatory Basel II Expected Loss quantification ($EL = PD \times EAD \times 0.45$) and multi-factor XAI borrower scoring.
3. `feat(api): modularize routes, add goals CRUD and formula injection mitigation`
   - Added modular FastAPI routers for prediction, dashboard, and administration.
   - Neutralized CWE-1236 formula injection in CSV exports and added startup lifespan seeding.
4. `refactor(frontend): migrate CRA to Vite + React 19 and modularize predict dashboard`
   - Migrated frontend build pipeline to Vite + React 19 + Recharts.
   - Decomposed monolithic `Predict.js` into modular components.
   - Integrated centralized Axios client with JWT interceptor, AuthContext, and ProtectedRoute.
5. `test(all): add Pytest and Vitest test suites and overhaul README with architecture specs`
   - Added 16 Pytest tests for the backend and 10 Vitest tests for the frontend.
   - Overhauled `README.md` with system architecture diagrams, mathematical formulations, and API specifications.

---

## Verification & Test Results

### Backend Pytest Suite
```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```
- **Result:** 16 passed in 11.96s (100% pass rate)
- **Coverage:** User registration, duplicate checks, login, JWT validation and expiry, anonymous/authenticated predictions, role enforcement (Borrower returning 403 Forbidden on bank underwriting), Basel II loss verification, goal CRUD, and CSV formula injection defense.

### Frontend Vitest Suite
```bash
cd frontend
npm test
```
- **Result:** 10 passed in 1.12s (100% pass rate)
- **Coverage:** Auth form rendering, demo account auto-fill, token persistence in localStorage, form input constraints, XAI scorecard tags, and Recharts rendering.

### Production Build
```bash
cd frontend
npm run build
```
- **Result:** Successfully compiled production assets in 1.31s without build warnings.

---

## Local Testing Instructions for Maintainer

### 1. Backend Service
```bash
cd CreditPathAI/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
- Interactive API Documentation: `http://127.0.0.1:8000/docs`

### 2. Frontend Service
```bash
cd CreditPathAI/frontend
npm install
npm run dev
```
- Application Interface: `http://localhost:3000` (or `http://localhost:5173`)

### 3. Pre-Seeded Accounts for Testing
The application automatically seeds three demo accounts on initial startup:
- **System Administrator:** `admin@creditpath.ai` | `CreditPath@2026`
- **Bank Risk Officer:** `agent@creditpath.ai` | `CreditPath@2026`
- **Retail Borrower:** `borrower@creditpath.ai` | `CreditPath@2026`
*(Quick-selection pills are provided on the `/auth` page for testing convenience).*
