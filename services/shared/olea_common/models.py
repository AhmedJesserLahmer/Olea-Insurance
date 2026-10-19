from sqlalchemy import Column, Integer, Text, String, Float, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from olea_common.database import Base

# JSONB on PostgreSQL, plain JSON elsewhere (SQLite in unit tests)
JSONType = JSON().with_variant(JSONB(), "postgresql")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    predictions = relationship("PredictionHistory", back_populates="user", cascade="all, delete-orphan")


class ChatHistory(Base):
    __tablename__ = "chat_history"
    # Named like the db_init upgrades so fresh and migrated databases match
    __table_args__ = (Index("uq_chat_history_event_id", "event_id", unique=True),)

    id = Column(Integer, primary_key=True, index=True)
    # Kafka event id: makes writes idempotent when a message is delivered twice
    event_id = Column(String(36), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_message = Column(Text)
    ai_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)


class PredictionHistory(Base):
    __tablename__ = "prediction_history"
    __table_args__ = (Index("uq_prediction_history_event_id", "event_id", unique=True),)

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(36), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    input_payload = Column(JSONType, nullable=False)
    output_payload = Column(JSONType, nullable=False)
    recommended_bundle_id = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="predictions")


class ClientProfileSubmission(Base):
    """Every profile a client submits in the prediction form, as received."""

    __tablename__ = "client_profile_submissions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(36), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payload = Column(JSONType, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
