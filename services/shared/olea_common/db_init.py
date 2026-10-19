"""Create and upgrade the database schema.

create_all() only creates missing tables, so columns added after a table exists
are applied here with idempotent ALTER statements (PostgreSQL only).
"""
from sqlalchemy import text

from olea_common.database import engine
from olea_common.models import Base

POSTGRES_UPGRADES = [
    "ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS event_id VARCHAR(36)",
    "ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)",
    "ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_history_event_id ON chat_history (event_id)",
    "CREATE INDEX IF NOT EXISTS ix_chat_history_user_id ON chat_history (user_id)",
    "ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS event_id VARCHAR(36)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_prediction_history_event_id ON prediction_history (event_id)",
]


def init_db() -> None:
    if engine.dialect.name != "postgresql":
        Base.metadata.create_all(bind=engine)
        return

    with engine.begin() as conn:
        # Serialize schema changes when several replicas start at once
        conn.execute(text("SELECT pg_advisory_xact_lock(4242)"))
        Base.metadata.create_all(bind=conn)
        for statement in POSTGRES_UPGRADES:
            conn.execute(text(statement))
