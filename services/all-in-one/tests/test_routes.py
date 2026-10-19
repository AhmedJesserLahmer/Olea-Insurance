def test_all_in_one_serves_every_service(client):
    paths = set(client.get("/openapi.json").json()["paths"])
    assert {"/health", "/auth/login", "/auth/demo", "/predictions/me", "/predict-bundle", "/rag"} <= paths


def test_all_in_one_end_to_end(client, fake_rag):
    token = client.post("/auth/demo").json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    before = len(client.get("/predictions/me", headers=headers).json())
    assert client.post("/predict-bundle", json={"age": 40, "annual_income": 60000}, headers=headers).status_code == 200
    assert len(client.get("/predictions/me", headers=headers).json()) == before + 1
    assert client.post("/rag", json={"question": "hi"}, headers=headers).json() == {"response": "Answer to: hi"}
