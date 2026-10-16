import os
import sys
import tempfile
import types

import pytest

# Configure the app before any backend module is imported
_db_dir = tempfile.mkdtemp(prefix="olea-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_dir}/test.db"
os.environ["JWT_SECRET_KEY"] = "test-secret"
os.environ["DEMO_MODE"] = "true"
os.environ.pop("KAFKA_BOOTSTRAP_SERVERS", None)

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from database import SessionLocal, engine  # noqa: E402
from models import Base  # noqa: E402
from seed import DEMO_EMAIL, DEMO_PASSWORD, seed_demo_data  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def demo_headers(client):
    res = client.post("/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def fake_rag(monkeypatch):
    """Replace the heavy RAG pipeline (Pinecone + TinyLlama) with a stub."""
    module = types.ModuleType("rag_model")
    module.RAG_Solution = lambda question, temperature=0.2: f"Answer to: {question}"
    monkeypatch.setitem(sys.modules, "rag_model", module)
    return module
