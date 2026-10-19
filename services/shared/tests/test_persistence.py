import pytest

from olea_common.models import ChatHistory, ClientProfileSubmission, PredictionHistory, User
from olea_common.persistence import (
    TOPIC_CHAT_COMPLETED,
    TOPIC_PREDICTION_COMPLETED,
    TOPIC_PROFILE_SUBMITTED,
    InvalidEvent,
    apply_event,
    make_event,
)

PREDICTION = {"recommended_bundle_id": 2, "confidence": 0.7, "top_recommendations": []}


@pytest.fixture
def user_id(db):
    return db.query(User).first().id


def test_prediction_event_is_stored_once(db, user_id):
    event = make_event(TOPIC_PREDICTION_COMPLETED, user_id, {"profile": {"age": 30}, "prediction": PREDICTION})
    before = db.query(PredictionHistory).count()

    assert apply_event(db, event) is True
    assert apply_event(db, event) is False  # Kafka redelivery

    assert db.query(PredictionHistory).count() == before + 1
    row = db.query(PredictionHistory).filter_by(event_id=event["event_id"]).one()
    assert row.recommended_bundle_id == 2
    assert row.input_payload == {"age": 30}


def test_profile_event_is_stored(db, user_id):
    event = make_event(TOPIC_PROFILE_SUBMITTED, user_id, {"profile": {"age": 30}})
    assert apply_event(db, event) is True
    assert db.query(ClientProfileSubmission).one().payload == {"age": 30}


def test_chat_event_is_stored_with_owner(db, user_id):
    event = make_event(TOPIC_CHAT_COMPLETED, user_id, {"question": "Q?", "answer": "A."})
    assert apply_event(db, event) is True
    row = db.query(ChatHistory).filter_by(event_id=event["event_id"]).one()
    assert (row.user_id, row.user_message, row.ai_response) == (user_id, "Q?", "A.")


def test_unknown_event_type_is_invalid(db, user_id):
    with pytest.raises(InvalidEvent):
        apply_event(db, make_event("something.else", user_id, {}))


def test_malformed_event_is_invalid(db, user_id):
    with pytest.raises(InvalidEvent):
        apply_event(db, make_event(TOPIC_PREDICTION_COMPLETED, user_id, {"profile": {}}))
