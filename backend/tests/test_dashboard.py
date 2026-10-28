def test_goals_crud(client, borrower_headers, agent_headers):
    # 1. Create Goal
    payload = {
        "title": "Emergency Reserve Fund",
        "target_amount": 50000.0,
        "saved_amount": 15000.0,
    }
    create_res = client.post("/api/dashboard/goals", json=payload, headers=borrower_headers)
    assert create_res.status_code == 201
    goal = create_res.json()
    assert goal["title"] == "Emergency Reserve Fund"
    assert goal["target_amount"] == 50000.0
    goal_id = goal["id"]

    # 2. Get Goals
    get_res = client.get("/api/dashboard/goals", headers=borrower_headers)
    assert get_res.status_code == 200
    goals = get_res.json()
    assert len(goals) == 1
    assert goals[0]["id"] == goal_id

    # 3. Agent trying to delete borrower's goal should get 404 (not found in agent's goals)
    del_forbidden = client.delete(f"/api/dashboard/goals/{goal_id}", headers=agent_headers)
    assert del_forbidden.status_code == 404

    # 4. Borrower deletes own goal
    del_res = client.delete(f"/api/dashboard/goals/{goal_id}", headers=borrower_headers)
    assert del_res.status_code == 200

    # 5. Verify goals list is empty
    empty_res = client.get("/api/dashboard/goals", headers=borrower_headers)
    assert empty_res.status_code == 200
    assert len(empty_res.json()) == 0


def test_history_crud(client, borrower_headers):
    # Create prediction
    client.post(
        "/api/predict/user",
        json={
            "loan_type": "home",
            "income": 70000,
            "credit_score": 710,
            "loan_amount": 200000,
            "missed_payments": 0,
        },
        headers=borrower_headers,
    )

    # Verify history
    history_res = client.get("/api/dashboard/history", headers=borrower_headers)
    assert history_res.status_code == 200
    assert len(history_res.json()) == 1

    # Clear history
    clear_res = client.delete("/api/dashboard/history", headers=borrower_headers)
    assert clear_res.status_code == 200
    assert clear_res.json()["deleted_count"] == 1

    # Verify cleared
    empty_res = client.get("/api/dashboard/history", headers=borrower_headers)
    assert len(empty_res.json()) == 0


def test_admin_rbac_and_metrics(client, borrower_headers, agent_headers, admin_headers):
    # 1. Non-admin access should be 403 Forbidden
    res_borrower = client.get("/api/admin/metrics", headers=borrower_headers)
    assert res_borrower.status_code == 403

    res_agent = client.get("/api/admin/metrics", headers=agent_headers)
    assert res_agent.status_code == 403

    # Seed a prediction
    client.post(
        "/api/predict/bank",
        json={
            "loan_amount": 450000,
            "income": 30000,
            "Credit_Score": 540,
            "LTV": 95,
            "dtir1": 55,
        },
        headers=admin_headers,
    )

    # 2. Admin access should succeed
    res_admin = client.get("/api/admin/metrics", headers=admin_headers)
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert data["total_users"] >= 3
    assert data["total_predictions"] >= 1
    assert "risk_distribution" in data

    # 3. Admin users list
    res_users = client.get("/api/admin/users", headers=admin_headers)
    assert res_users.status_code == 200
    assert len(res_users.json()) >= 3

    # 4. Admin full history
    res_hist = client.get("/api/admin/history", headers=admin_headers)
    assert res_hist.status_code == 200
    assert len(res_hist.json()) >= 1


def test_admin_csv_export_and_formula_injection_prevention(client, admin_headers):
    # Create user with formula injection payload in full_name
    client.post(
        "/api/auth/register",
        json={
            "email": "injected@example.com",
            "password": "Password123",
            "full_name": "=cmd|' /C calc'!A0",
            "role": "BORROWER",
        },
    )

    # Export users CSV
    res_csv = client.get("/api/admin/export-csv?type=users", headers=admin_headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    csv_text = res_csv.text

    # The formula starting with '=' must be escaped with a leading single quote "'"
    assert "'=cmd|' /C calc'!A0" in csv_text

    # Export history CSV
    res_hist_csv = client.get("/api/admin/export-csv?type=history", headers=admin_headers)
    assert res_hist_csv.status_code == 200
    assert "text/csv" in res_hist_csv.headers["content-type"]
