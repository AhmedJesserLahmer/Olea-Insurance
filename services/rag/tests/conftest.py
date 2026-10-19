import pytest
from fastapi.testclient import TestClient

from olea_rag.app import app


@pytest.fixture
def client():
    return TestClient(app)
