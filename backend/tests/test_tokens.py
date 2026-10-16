from jose import jwt

from auth import ALGORITHM, SECRET_KEY, create_access_token
from schemas import PredictBundleRequest

PROFILE = PredictBundleRequest(age=40, annual_income=60000).model_dump()


def test_token_carries_user_id(client):
    token = client.post("/auth/demo").json()["access_token"]
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert isinstance(claims["uid"], int)


def test_stateless_routes_reject_tokens_without_uid(client):
    legacy = create_access_token(subject="demo@olea.com")
    res = client.post("/predict-bundle", json=PROFILE, headers={"Authorization": f"Bearer {legacy}"})
    assert res.status_code == 401


def test_invalid_token_rejected(client):
    res = client.post("/predict-bundle", json=PROFILE, headers={"Authorization": "Bearer not-a-jwt"})
    assert res.status_code == 401
