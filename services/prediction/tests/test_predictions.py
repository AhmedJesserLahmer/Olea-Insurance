from olea_common.bundles import BUNDLE_META
from olea_common.models import ClientProfileSubmission, PredictionHistory
from olea_common.schemas import PredictBundleRequest

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


def test_prediction_is_saved_with_profile(client, demo_headers, demo_user, db):
    mine = db.query(PredictionHistory).filter(PredictionHistory.user_id == demo_user.id)
    before = mine.count()
    client.post("/predict-bundle", json=PROFILE, headers=demo_headers)

    assert mine.count() == before + 1
    latest = mine.filter(PredictionHistory.event_id.isnot(None)).one()
    assert latest.input_payload["child_dependents"] == 2
    assert db.query(ClientProfileSubmission).count() == 1


def test_prediction_requires_authentication(client):
    assert client.post("/predict-bundle", json=PROFILE).status_code == 401
