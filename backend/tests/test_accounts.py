from seed import DEMO_EMAIL


def test_signup_login_and_me(client):
    res = client.post("/auth/signup", json={"email": "New@Example.com ", "full_name": " New User ", "password": "pw-123456"})
    assert res.status_code == 200
    assert res.json()["email"] == "new@example.com"

    login = client.post("/auth/login", json={"email": "new@example.com", "password": "pw-123456"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json() == {"id": res.json()["id"], "email": "new@example.com", "full_name": "New User"}


def test_signup_rejects_duplicate_email(client):
    res = client.post("/auth/signup", json={"email": DEMO_EMAIL, "full_name": "Again", "password": "x"})
    assert res.status_code == 400


def test_login_rejects_wrong_password(client):
    res = client.post("/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
    assert res.status_code == 401


def test_demo_access_signs_in_as_demo_user(client):
    res = client.post("/auth/demo")
    assert res.status_code == 200
    assert res.json()["user"]["email"] == DEMO_EMAIL


def test_demo_access_disabled(client, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "false")
    assert client.post("/auth/demo").status_code == 404


def test_history_requires_authentication(client):
    assert client.get("/predictions/me").status_code == 401
