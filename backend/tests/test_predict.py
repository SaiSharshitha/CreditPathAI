def test_user_predict_anonymous(client):
    payload = {
        "loan_type": "home",
        "income": 85000,
        "credit_score": 750,
        "loan_amount": 250000,
        "missed_payments": 0,
    }
    response = client.post("/api/predict/user", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "Low"
    assert data["approval_chance"] == 90
    assert len(data["recommendation_summary"]) > 0
    assert len(data["tips"]) > 0
    assert len(data["xai_factors"]) > 0
    assert "dti_advice" in data


def test_user_predict_authenticated_records_history(client, borrower_headers):
    payload = {
        "loan_type": "car",
        "income": 40000,
        "credit_score": 620,
        "loan_amount": 150000,
        "missed_payments": 1,
    }
    response = client.post("/api/predict/user", json=payload, headers=borrower_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ("Medium", "Low", "High")

    # Check that history now has this record
    history_res = client.get("/api/dashboard/history", headers=borrower_headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 1
    assert history[0]["prediction_type"] == "user"
    assert history[0]["loan_amount"] == 150000


def test_bank_predict_rbac(client, borrower_headers, agent_headers, admin_headers):
    payload = {
        "loan_amount": 200000,
        "income": 75000,
        "Credit_Score": 760,
        "LTV": 65,
        "dtir1": 28,
    }

    # 1. Anonymous request should be rejected with 401
    res_anon = client.post("/api/predict/bank", json=payload)
    assert res_anon.status_code == 401

    # 2. Borrower role should be rejected with 403 Forbidden
    res_borrower = client.post("/api/predict/bank", json=payload, headers=borrower_headers)
    assert res_borrower.status_code == 403

    # 3. Agent role should succeed
    res_agent = client.post("/api/predict/bank", json=payload, headers=agent_headers)
    assert res_agent.status_code == 200
    agent_data = res_agent.json()
    assert "default_probability" in agent_data
    assert "expected_loss" in agent_data
    assert "loan_status" in agent_data
    assert "bank_decision" in agent_data

    # 4. Admin role should also succeed
    res_admin = client.post("/api/predict/bank", json=payload, headers=admin_headers)
    assert res_admin.status_code == 200


def test_bank_predict_underwriting_bands_and_basel_el(client, agent_headers):
    # Prime Low Risk Application
    prime_payload = {
        "loan_amount": 200000,
        "income": 90000,
        "Credit_Score": 790,
        "LTV": 60,
        "dtir1": 25,
    }
    res_prime = client.post("/api/predict/bank", json=prime_payload, headers=agent_headers)
    assert res_prime.status_code == 200
    prime = res_prime.json()
    assert prime["default_probability"] < 0.30
    assert prime["loan_status"] == "Approved"
    assert prime["bank_decision"]["priority"] == "Low"
    assert prime["bank_decision"]["recovery_channel"] == "Email + SMS"
    assert prime["bank_decision"]["follow_up"] == "15 days"
    # Basel II EL = PD * Loan_Amount * 0.45
    expected_el = round(prime["default_probability"] * 200000 * 0.45, 2)
    assert abs(prime["expected_loss"] - expected_el) <= 1.0

    # Medium Risk Application
    med_payload = {
        "loan_amount": 300000,
        "income": 50000,
        "Credit_Score": 640,
        "LTV": 80,
        "dtir1": 42,
    }
    res_med = client.post("/api/predict/bank", json=med_payload, headers=agent_headers)
    assert res_med.status_code == 200
    med = res_med.json()
    assert 0.30 <= med["default_probability"] < 0.60
    assert med["loan_status"] == "Conditionally Approved"
    assert med["bank_decision"]["priority"] == "Medium"
    assert med["bank_decision"]["recovery_channel"] == "Phone Call + Verification"
    assert med["bank_decision"]["follow_up"] == "Weekly"

    # High Risk Application
    high_payload = {
        "loan_amount": 450000,
        "income": 25000,
        "Credit_Score": 530,
        "LTV": 96,
        "dtir1": 56,
    }
    res_high = client.post("/api/predict/bank", json=high_payload, headers=agent_headers)
    assert res_high.status_code == 200
    high = res_high.json()
    assert high["default_probability"] >= 0.60
    assert "Rejected" in high["loan_status"] or "High Risk" in high["loan_status"]
    assert high["bank_decision"]["priority"] == "High"
    assert high["bank_decision"]["recovery_channel"] == "Field Investigation + Legal Notice"
    assert high["bank_decision"]["follow_up"] == "Every 3 days"
