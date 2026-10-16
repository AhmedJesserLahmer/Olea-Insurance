"""Mock data for local development and demos.

Run directly with `python seed.py`, or let the API seed on startup when DEMO_MODE is enabled.
Seeding is idempotent: users that already exist are left untouched.
"""
import os
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from auth import get_password_hash
from bundle_model import BUNDLE_META
from models import ChatHistory, PredictionHistory, User

DEMO_EMAIL = "demo@olea.com"
DEMO_PASSWORD = "OleaDemo2026!"


def demo_mode_enabled() -> bool:
    return os.getenv("DEMO_MODE", "true").strip().lower() in {"1", "true", "yes", "on"}


MOCK_USERS = [
    {"email": DEMO_EMAIL, "full_name": "Olea Demo", "password": DEMO_PASSWORD},
    {"email": "sarah.benali@example.com", "full_name": "Sarah Ben Ali", "password": "Password123!"},
    {"email": "youssef.trabelsi@example.com", "full_name": "Youssef Trabelsi", "password": "Password123!"},
]

# (owner email, days ago, profile overrides, ranked (bundle_id, confidence) pairs)
MOCK_PREDICTIONS = [
    (DEMO_EMAIL, 1, {"age": 34, "annual_income": 38000, "child_dependents": 0}, [(1, 0.6124), (0, 0.2213), (8, 0.0841)]),
    (DEMO_EMAIL, 3, {"age": 41, "annual_income": 72000, "child_dependents": 2, "adult_dependents": 2}, [(2, 0.7032), (3, 0.1650), (1, 0.0710)]),
    (DEMO_EMAIL, 6, {"age": 29, "annual_income": 45000, "vehicles_on_policy": 1}, [(5, 0.5488), (4, 0.3015), (8, 0.0802)]),
    (DEMO_EMAIL, 9, {"age": 55, "annual_income": 120000, "existing_policyholder": True}, [(3, 0.8120), (7, 0.1105), (2, 0.0412)]),
    (DEMO_EMAIL, 14, {"age": 24, "annual_income": 21000, "employment_status": "Student"}, [(8, 0.6633), (9, 0.1890), (0, 0.0921)]),
    (DEMO_EMAIL, 21, {"age": 47, "annual_income": 95000, "vehicles_on_policy": 2}, [(7, 0.5901), (6, 0.2740), (5, 0.0855)]),
    ("sarah.benali@example.com", 2, {"age": 38, "annual_income": 64000, "child_dependents": 1}, [(2, 0.5812), (1, 0.2604), (3, 0.0977)]),
    ("youssef.trabelsi@example.com", 5, {"age": 31, "annual_income": 52000, "vehicles_on_policy": 1}, [(4, 0.4977), (5, 0.3881), (6, 0.0603)]),
]

MOCK_CHATS = [
    ("What does the Family Comprehensive bundle cover?",
     "Family Comprehensive (FC-003) covers health, dental and vision for every dependent on the policy, "
     "with shared deductibles and preventive care included."),
    ("Can I switch from Renter's Basic to Home Standard?",
     "Yes. When you buy a home you can upgrade from Renter's Basic (RB-009) to Home Standard (HS-007); "
     "your claim-free years carry over to the new policy."),
    ("How does the deductible tier affect my premium?",
     "A higher deductible tier lowers your monthly premium but increases what you pay out of pocket before coverage starts."),
]

BASE_PROFILE = {
    "age": 34,
    "annual_income": 38000.0,
    "adult_dependents": 1,
    "child_dependents": 0,
    "infant_dependents": 0,
    "existing_policyholder": False,
    "previous_claims_filed": 0,
    "years_without_claims": 2,
    "policy_amendments_count": 0,
    "vehicles_on_policy": 0,
    "custom_riders_requested": 1,
    "deductible_tier": 2,
    "days_since_quote": 10,
    "previous_policy_duration_months": 0,
    "grace_period_extensions": 0,
    "has_employer_id": False,
    "has_broker_id": False,
    "broker_id": "Unknown",
    "region_code": "Unknown",
    "acquisition_channel": "Direct_Website",
    "payment_schedule": "Annual_Upfront",
    "employment_status": "Employed",
    "notes": "",
}


def _build_output(ranked):
    top = []
    for bundle_id, confidence in ranked:
        code, name = BUNDLE_META[bundle_id]
        top.append({"bundle_id": bundle_id, "bundle_code": code, "bundle_name": name, "confidence": confidence})

    best = top[0]
    return {
        "recommended_bundle_id": best["bundle_id"],
        "recommended_bundle_code": best["bundle_code"],
        "recommended_bundle_name": best["bundle_name"],
        "confidence": best["confidence"],
        "reasoning": (
            f"Mock data: the model ranked {best['bundle_name']} as the best fit "
            f"with {best['confidence'] * 100:.1f}% confidence."
        ),
        "top_recommendations": top,
        "context_snippets": [],
    }


def seed_demo_data(db: Session) -> None:
    users = {}
    for entry in MOCK_USERS:
        user = db.query(User).filter(User.email == entry["email"]).first()
        if user is not None:
            users[entry["email"]] = (user, False)
            continue

        user = User(
            email=entry["email"],
            full_name=entry["full_name"],
            hashed_password=get_password_hash(entry["password"]),
        )
        db.add(user)
        db.flush()
        users[entry["email"]] = (user, True)

    # Only add predictions for users created in this run, so reseeding never duplicates history.
    now = datetime.utcnow()
    for email, days_ago, overrides, ranked in MOCK_PREDICTIONS:
        user, created = users[email]
        if not created:
            continue

        output = _build_output(ranked)
        db.add(
            PredictionHistory(
                user_id=user.id,
                input_payload={**BASE_PROFILE, **overrides},
                output_payload=output,
                recommended_bundle_id=output["recommended_bundle_id"],
                confidence=output["confidence"],
                created_at=now - timedelta(days=days_ago),
            )
        )

    if db.query(ChatHistory).count() == 0:
        for question, answer in MOCK_CHATS:
            db.add(ChatHistory(user_message=question, ai_response=answer))

    db.commit()


if __name__ == "__main__":
    from database import SessionLocal, engine
    from models import Base

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        seed_demo_data(session)
        print(f"Mock data ready. Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        session.close()
