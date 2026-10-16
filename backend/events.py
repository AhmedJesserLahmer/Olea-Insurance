"""Publish domain events to Kafka, or store them directly when Kafka is not configured.

KAFKA_BOOTSTRAP_SERVERS set   -> events go to Kafka; history_writer.py stores them.
KAFKA_BOOTSTRAP_SERVERS unset -> events are stored right away (single-process
                                 deployments such as Render, and unit tests).
If Kafka is configured but does not acknowledge an event, it is stored directly
so no data is lost; event_id keeps a late duplicate from being stored twice.
"""
import json
import logging
import os
from typing import Optional

from database import SessionLocal
from persistence import apply_event

logger = logging.getLogger("olea.events")

PUBLISH_TIMEOUT_SECONDS = float(os.getenv("KAFKA_PUBLISH_TIMEOUT_SECONDS", "5"))


def kafka_enabled() -> bool:
    return bool(os.getenv("KAFKA_BOOTSTRAP_SERVERS", "").strip())


class EventPublisher:
    def __init__(self) -> None:
        self._producer = None

    def _get_producer(self):
        if self._producer is None:
            from confluent_kafka import Producer

            self._producer = Producer({
                "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP_SERVERS"],
                "client.id": os.getenv("SERVICE_NAME", "olea"),
                "acks": "all",
                "enable.idempotence": True,
            })
        return self._producer

    def publish(self, event: dict) -> None:
        if not kafka_enabled():
            self._store(event)
            return

        error: Optional[str] = None
        try:
            delivered = {}

            def on_delivery(err, _msg):
                delivered["error"] = err

            producer = self._get_producer()
            producer.produce(
                event["type"],
                key=str(event["user_id"]).encode(),
                value=json.dumps(event).encode(),
                on_delivery=on_delivery,
            )
            remaining = producer.flush(PUBLISH_TIMEOUT_SECONDS)
            if remaining:
                error = "delivery timed out"
            elif delivered.get("error") is not None:
                error = str(delivered["error"])
        except Exception as exc:  # broker unreachable, bad config...
            error = str(exc)

        if error:
            logger.warning("Kafka publish failed for %s (%s), storing directly", event["event_id"], error)
            self._store(event)

    @staticmethod
    def _store(event: dict) -> None:
        db = SessionLocal()
        try:
            apply_event(db, event)
        finally:
            db.close()


publisher = EventPublisher()
