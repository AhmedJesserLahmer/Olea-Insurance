"""history-writer: consumes domain events from Kafka and stores them in PostgreSQL.

- Offsets are committed only after the event is stored (at-least-once delivery);
  apply_event() skips event_ids already stored, so redeliveries are harmless.
- Events that can never be stored are copied to the dead-letter topic.
- Database errors are retried with backoff on the same message, nothing is skipped.
- GET :8081/health answers 200 while the poll loop is alive (Kubernetes probes).
"""
import json
import logging
import os
import signal
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from confluent_kafka import Consumer, KafkaError, Producer

from olea_common.database import SessionLocal
from olea_common.db_init import init_db
from olea_common.persistence import TOPIC_DEAD_LETTER, TOPICS, InvalidEvent, apply_event

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("olea.history_writer")

HEALTH_PORT = int(os.getenv("HEALTH_PORT", "8081"))
STALE_AFTER_SECONDS = 60
MAX_BACKOFF_SECONDS = 30

_stop = threading.Event()
_last_poll = time.monotonic()


class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        healthy = self.path == "/health" and time.monotonic() - _last_poll < STALE_AFTER_SECONDS
        self.send_response(200 if healthy else 503)
        self.end_headers()
        self.wfile.write(b'{"status":"ok"}' if healthy else b'{"status":"stale"}')

    def log_message(self, *_args):
        pass


def _start_health_server() -> None:
    server = HTTPServer(("0.0.0.0", HEALTH_PORT), _HealthHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()


def _store_with_retry(event: dict) -> None:
    delay = 1
    while not _stop.is_set():
        db = SessionLocal()
        try:
            stored = apply_event(db, event)
            logger.info("%s %s (%s)", "stored" if stored else "skipped duplicate", event["event_id"], event["type"])
            return
        except InvalidEvent:
            raise
        except Exception:
            logger.exception("Database write failed for %s, retrying in %ss", event.get("event_id"), delay)
            _stop.wait(delay)
            delay = min(delay * 2, MAX_BACKOFF_SECONDS)
        finally:
            db.close()


def _dead_letter(producer: Producer, raw: bytes, reason: str) -> None:
    logger.error("Sending message to %s: %s", TOPIC_DEAD_LETTER, reason)
    producer.produce(TOPIC_DEAD_LETTER, value=raw, headers={"error": reason[:500]})
    producer.flush(10)


def run() -> None:
    global _last_poll

    init_db()
    _start_health_server()

    bootstrap = os.environ["KAFKA_BOOTSTRAP_SERVERS"]
    consumer = Consumer({
        "bootstrap.servers": bootstrap,
        "group.id": os.getenv("KAFKA_CONSUMER_GROUP", "history-writer"),
        "enable.auto.commit": False,
        "auto.offset.reset": "earliest",
        # Topics may be created after the consumer starts (Helm post-install hook)
        "topic.metadata.refresh.interval.ms": 10000,
    })
    producer = Producer({"bootstrap.servers": bootstrap, "client.id": "history-writer"})
    consumer.subscribe(list(TOPICS))
    logger.info("Consuming %s from %s", ", ".join(TOPICS), bootstrap)

    try:
        while not _stop.is_set():
            _last_poll = time.monotonic()
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    logger.warning("Kafka error: %s", msg.error())
                continue

            try:
                event = json.loads(msg.value())
                _store_with_retry(event)
            except (InvalidEvent, ValueError, TypeError) as exc:
                _dead_letter(producer, msg.value(), str(exc))

            if _stop.is_set():
                break  # shutting down mid-retry: leave the offset uncommitted
            consumer.commit(message=msg, asynchronous=False)
    finally:
        consumer.close()
        producer.flush(5)
        logger.info("Stopped")


def _handle_signal(signum, _frame):
    logger.info("Received signal %s, shutting down", signum)
    _stop.set()


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    run()
