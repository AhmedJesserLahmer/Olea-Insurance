import pytest
from fastapi.testclient import TestClient

from olea_prediction.app import app


@pytest.fixture
def client():
    return TestClient(app)
