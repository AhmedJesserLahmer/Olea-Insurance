import pytest
from fastapi.testclient import TestClient

from olea_all.app import app


@pytest.fixture
def client():
    return TestClient(app)
