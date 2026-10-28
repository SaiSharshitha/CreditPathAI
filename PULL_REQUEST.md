# Pull Request: Comprehensive Enterprise Refactor & Security Hardening

## 📌 Overview
This pull request elevates **CreditPath AI** from an early-stage prototype into a secure, production-grade Credit Risk Assessment and Decision Support Platform. 

It addresses critical security vulnerabilities, resolves a machine learning feature-scaling mismatch, introduces real SQLite relational persistence with JWT authentication and Role-Based Access Control (RBAC), and modernizes the frontend to **Vite + React 19** with responsive Recharts visualizations — **while keeping the original visual identity, layout, and styling intact**.

---

## 🏛️ What Changed & Why (Before vs. After)

| Component | Before (Legacy) | After (This PR) |
| :--- | :--- | :--- |
| **Authentication & Passwords** | Hardcoded backdoor (`admin@creditpath.com` / `admin123`); plain text passwords stored in client `localStorage`. | Cryptographically salted **`bcrypt` password hashing** (12 rounds) with **OAuth2 JWT tokens** (PyJWT). |
| **Authorization (RBAC)** | Roles self-assigned client-side; no server enforcement. | Server-side role enforcement (`BORROWER`, `BANK_AGENT`, `ADMIN`); unauthorized actions return `403 Forbidden`. |
| **Data Persistence** | None on backend; all accounts, history, and goals saved only in the current browser's `localStorage`. | Relational **SQLite persistence (`creditpath.db`)** via **SQLAlchemy 2.0 ORM** with automated schema and demo account seeding. |
| **ML Inference Pipeline** | Production inputs passed unscaled into decision trees; 31 of 36 features hardcoded to `0` (feature distortion). | **Empirical Normalizer** scales inputs against reference dataset distributions from `loan_data_sample.csv` before model evaluation. |
| **Expected Loss Metric** | Arbitrary calculations; frontend ignored backend responses. | Regulatory **Basel II Expected Loss framework** ($EL = PD \times EAD \times LGD$, where $LGD = 0.45$). Frontend directly consumes API metrics. |
| **Frontend Tooling** | Deprecated Create React App (`react-scripts 5.0.1`) with **63 known supply-chain vulnerabilities**. | **Vite + React 19** toolchain with 0 vulnerabilities, sub-second HMR, and clean production builds. |
| **Data Visualization** | Heavy monolithic `plotly.js` bundle (>3.5 MB minified). | Modern, responsive **Recharts** charts matching the exact original color theme with >80% bundle reduction. |
| **Code Modularity** | 679-line monolithic `Predict.js` mixing forms, charts, and heuristics. | Decomposed into clean modular components: `UserPredictForm`, `BankPredictForm`, `RiskScorecard`, and `RiskCharts`. |
| **Automated Testing** | 1 failing boilerplate test; 0 backend tests. | **26 automated tests (100% pass rate)**: 16 Pytest tests + 10 Vitest tests. |

---

## 🗂️ Atomic Commits Included

This PR consists of 5 self-contained, atomic commits following the [Conventional Commits](https://www.conventionalcommits.org/) specification:

1. `feat(backend): implement SQLite persistence, bcrypt hashing, and JWT RBAC`
   - Configures SQLAlchemy 2.0 database engine and `User`, `PredictionRecord`, and `FinancialGoal` models.
   - Adds bcrypt password hashing, PyJWT tokens, and security dependencies.
2. `fix(ml): resolve feature normalization mismatch and implement Basel II Expected Loss`
   - Adds empirical baseline preprocessor to map raw borrower inputs to scaled space.
   - Calculates regulatory Basel II Expected Loss ($EL = PD \times EAD \times 0.45$) and multi-factor XAI borrower scoring.
3. `feat(api): modularize routes, add goals CRUD and formula injection mitigation`
   - Adds modular FastAPI routers for predict, dashboard, and administration.
   - Neutralizes CWE-1236 formula injection in CSV exports and adds startup seeder.
4. `refactor(frontend): migrate CRA to Vite + React 19 and modularize predict dashboard`
   - Migrates frontend to Vite + React 19 + Recharts.
   - Decomposes monolithic `Predict.js` into modular components.
   - Integrates centralized Axios client, AuthContext, ProtectedRoute, and 1-click demo pills.
5. `test(all): add Pytest and Vitest test suites and overhaul README with architecture specs`
   - Adds 16 Pytest tests for backend and 10 Vitest tests for frontend.
   - Completely overhauls `README.md` with system architecture diagrams, API specs, and setup instructions.

---

## 🧪 Verification & QA Results

### Backend Pytest Suite
```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```
> **16 passed in 11.96s (100% pass rate)**
> Covers: User registration, duplicate checks, login, JWT expiration, anonymous/authenticated predictions, role enforcement (Borrower $\rightarrow$ 403 Forbidden), Basel II formula validation, goal CRUD, and CSV formula injection defense.

### Frontend Vitest Suite
```bash
cd frontend
npm test
```
> **10 passed in 1.12s (100% pass rate)**
> Covers: Auth form rendering, demo account pills, token storage in `localStorage`, input validation, XAI scorecard tags, and Recharts rendering.

### Production Build
```bash
cd frontend
npm run build
```
> **Built cleanly in 1.31s** without bundle compilation errors.

---

## 🚀 How the Maintainer Can Test This PR Locally

### 1. Start the Backend
```bash
cd CreditPathAI/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
- API Docs: `http://127.0.0.1:8000/docs`

### 2. Start the Frontend
```bash
cd CreditPathAI/frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000` (or `http://localhost:5173`)

### 3. Demo Accounts to Test
The backend automatically seeds three demo accounts on first launch:
* **Admin**: `admin@creditpath.ai` | `CreditPath@2026`
* **Bank Officer**: `agent@creditpath.ai` | `CreditPath@2026`
* **Borrower**: `borrower@creditpath.ai` | `CreditPath@2026`
*(Quick 1-click login pills are provided on `/auth` for instant testing).*
