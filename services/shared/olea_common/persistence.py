"""Domain events and how they are stored.

Every event is a JSON envelope:
    {"event_id": uuid, "type": topic name, "occurred_at": ISO time, "user_id": int, "payload": {...}}

apply_event() is the single place that writes events to PostgreSQL. The Kafka
consumer (olea_history_writer.worker) and the no-Kafka fallback (events.py) both use it,
and it is idempotent: an event_id that is already stored is skipped.
"""
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from olea_common.models import ChatHistory, ClientProfileSubmission, PredictionHistory

TOPIC_PROFILE_SUBMITTED = "client.profile.submitted"
TOPIC_PREDICTION_COMPLETED = "prediction.completed"
TOPIC_CHAT_COMPLETED = "chat.completed"
TOPIC_DEAD_LETTER = "history.dead-letter"

TOPICS = (TOPIC_PROFILE_SUBMITTED, TOPIC_PREDICTION_COMPLETED, TOPIC_CHAT_COMPLETED)


class InvalidEvent(ValueError):
    """The event can never be stored (unknown type or missing fields)."""


def make_event(event_type: str, user_id: int, payload: dict) -> dict:
    return {
        "event_id": str(uuid4()),
        "type": event_type,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "payload": payload,
    }


def _occurred_at(event: dict) -> datetime:
    # Stored as naive UTC, like the existing created_at columns
    return datetime.fromisoformat(event["occurred_at"]).astimezone(timezone.utc).replace(tzinfo=None)


def _build_row(event: dict):
    payload = event["payload"]
    common = {"event_id": event["event_id"], "user_id": event["user_id"], "created_at": _occurred_at(event)}

    if event["type"] == TOPIC_PROFILE_SUBMITTED:
        return ClientProfileSubmission, ClientProfileSubmission(payload=payload["profile"], **common)

    if event["type"] == TOPIC_PREDICTION_COMPLETED:
        prediction = payload["prediction"]
        return PredictionHistory, PredictionHistory(
            input_payload=payload["profile"],
            output_payload=prediction,
            recommended_bundle_id=prediction["recommended_bundle_id"],
            confidence=prediction["confidence"],
            **common,
        )

    if event["type"] == TOPIC_CHAT_COMPLETED:
        return ChatHistory, ChatHistory(user_message=payload["question"], ai_response=payload["answer"], **common)

    raise InvalidEvent(f"Unknown event type: {event['type']!r}")


def apply_event(db: Session, event: dict) -> bool:
    """Store the event. Returns False when it was already stored."""
    try:
        model, row = _build_row(event)
    except (KeyError, TypeError, ValueError) as exc:
        if isinstance(exc, InvalidEvent):
            raise
        raise InvalidEvent(f"Malformed event: {exc}") from exc

    if db.query(model.id).filter(model.event_id == event["event_id"]).first():
        return False

    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        # Another consumer stored the same event between the check and the commit
        db.rollback()
        if db.query(model.id).filter(model.event_id == event["event_id"]).first():
            return False
        raise
    return True
