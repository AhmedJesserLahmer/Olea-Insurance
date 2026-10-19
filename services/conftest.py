"""Fixtures shared by every service's tests (SQLite, no PostgreSQL or Kafka needed)."""
import os
import sys
import tempfile
import types

import pytest

# Configure the services before any olea_* module is imported
_db_dir = tempfile.mkdtemp(prefix="olea-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_dir}/test.db"
os.environ["JWT_SECRET_KEY"] = "test-secret"
os.environ["DEMO_MODE"] = "true"
os.environ.pop("KAFKA_BOOTSTRAP_SERVERS", None)

from olea_common.auth import create_access_token  # noqa: E402
from olea_common.database import SessionLocal, engine  # noqa: E402
from olea_common.models import Base, User  # noqa: E402
from olea_common.seed import DEMO_EMAIL, seed_demo_data  # noqa: E402


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
def demo_user(db):
    return db.query(User).filter(User.email == DEMO_EMAIL).one()


@pytest.fixture
def demo_headers(demo_user):
    """A valid login token for the demo user, without going through api-svc."""
    token = create_access_token(subject=demo_user.email, user_id=demo_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def fake_rag(monkeypatch):
    """Replace the heavy RAG pipeline (Pinecone + TinyLlama) with a stub."""
    module = types.ModuleType("olea_rag.rag_model")
    module.RAG_Solution = lambda question, temperature=0.2: f"Answer to: {question}"
    monkeypatch.setitem(sys.modules, "olea_rag.rag_model", module)
    return module
