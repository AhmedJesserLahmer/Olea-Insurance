from olea_common import events
from olea_common.models import ClientProfileSubmission, User
from olea_common.persistence import TOPIC_PROFILE_SUBMITTED, make_event


def _event(db):
    return make_event(TOPIC_PROFILE_SUBMITTED, db.query(User).first().id, {"profile": {"age": 50}})


def test_without_kafka_events_are_stored_directly(db):
    events.EventPublisher().publish(_event(db))
    assert db.query(ClientProfileSubmission).count() == 1


def test_failed_kafka_publish_falls_back_to_direct_write(db, monkeypatch):
    monkeypatch.setenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    publisher = events.EventPublisher()

    def broken_producer():
        raise RuntimeError("broker unreachable")

    monkeypatch.setattr(publisher, "_get_producer", broken_producer)
    publisher.publish(_event(db))
    assert db.query(ClientProfileSubmission).count() == 1


def test_acknowledged_kafka_publish_does_not_write_directly(db, monkeypatch):
    monkeypatch.setenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    sent = []

    class FakeProducer:
        def produce(self, topic, key, value, on_delivery):
            sent.append(topic)
            self._callback = on_delivery

        def flush(self, _timeout):
            self._callback(None, None)
            return 0

    publisher = events.EventPublisher()
    monkeypatch.setattr(publisher, "_get_producer", lambda: FakeProducer())
    publisher.publish(_event(db))

    assert sent == [TOPIC_PROFILE_SUBMITTED]
    assert db.query(ClientProfileSubmission).count() == 0
