from bundles import BUNDLE_META
from models import ClientProfileSubmission
from schemas import PredictBundleRequest

PROFILE = PredictBundleRequest(age=40, annual_income=60000, child_dependents=2).model_dump()


def test_prediction_returns_ranked_bundles(client, demo_headers):
    res = client.post("/predict-bundle", json=PROFILE, headers=demo_headers)
    assert res.status_code == 200
    body = res.json()

    assert body["recommended_bundle_id"] in BUNDLE_META
    assert len(body["top_recommendations"]) == 3
    confidences = [item["confidence"] for item in body["top_recommendations"]]
    assert confidences == sorted(confidences, reverse=True)
    assert 0 <= body["confidence"] <= 1


def test_prediction_is_saved_with_profile(client, demo_headers, db):
    before = len(client.get("/predictions/me", headers=demo_headers).json())
    client.post("/predict-bundle", json=PROFILE, headers=demo_headers)

    history = client.get("/predictions/me", headers=demo_headers).json()
    assert len(history) == before + 1
    assert history[0]["input_payload"]["child_dependents"] == 2
    assert db.query(ClientProfileSubmission).count() == 1


def test_prediction_requires_authentication(client):
    assert client.post("/predict-bundle", json=PROFILE).status_code == 401
