from models import PredictionHistory, User
from seed import MOCK_PREDICTIONS, MOCK_USERS, seed_demo_data


def test_seed_creates_mock_data(db):
    assert db.query(User).count() == len(MOCK_USERS)
    assert db.query(PredictionHistory).count() == len(MOCK_PREDICTIONS)


def test_seed_is_idempotent(db):
    seed_demo_data(db)
    seed_demo_data(db)
    assert db.query(User).count() == len(MOCK_USERS)
    assert db.query(PredictionHistory).count() == len(MOCK_PREDICTIONS)
