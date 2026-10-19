from jose import jwt

from olea_common.auth import ALGORITHM, SECRET_KEY


def test_token_carries_user_id(client):
    token = client.post("/auth/demo").json()["access_token"]
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert isinstance(claims["uid"], int)
