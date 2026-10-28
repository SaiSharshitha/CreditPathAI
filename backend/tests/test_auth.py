def test_register_success(client):
    payload = {
        "email": "newuser@example.com",
        "password": "SecurePassword123",
        "full_name": "New Borrower",
        "role": "BORROWER",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["role"] == "BORROWER"


def test_register_duplicate_email(client):
    payload = {
        "email": "borrower@creditpath.ai",  # Already seeded
        "password": "Password123",
        "full_name": "Another Borrower",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]


def test_register_invalid_email_and_short_password(client):
    # Invalid email pattern
    res_email = client.post("/api/auth/register", json={"email": "not-an-email", "password": "Password123"})
    assert res_email.status_code == 422

    # Short password (< 6 chars)
    res_pass = client.post("/api/auth/register", json={"email": "valid@example.com", "password": "123"})
    assert res_pass.status_code == 422


def test_login_success(client):
    payload = {
        "email": "admin@creditpath.ai",
        "password": "CreditPath@2026",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@creditpath.ai"
    assert data["user"]["role"] == "ADMIN"


def test_login_invalid_password(client):
    payload = {
        "email": "admin@creditpath.ai",
        "password": "WrongPassword123",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    payload = {
        "email": "ghost@creditpath.ai",
        "password": "CreditPath@2026",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401


def test_auth_me_valid_token(client, borrower_headers):
    response = client.get("/api/auth/me", headers=borrower_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "borrower@creditpath.ai"
    assert data["role"] == "BORROWER"


def test_auth_me_missing_or_invalid_token(client):
    # Missing token
    res_missing = client.get("/api/auth/me")
    assert res_missing.status_code == 401

    # Corrupt token
    res_corrupt = client.get("/api/auth/me", headers={"Authorization": "Bearer bad.jwt.token"})
    assert res_corrupt.status_code == 401
