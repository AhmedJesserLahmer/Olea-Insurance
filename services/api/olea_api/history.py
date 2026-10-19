from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from olea_common.auth import get_current_user
from olea_common.database import get_db
from olea_common.models import PredictionHistory, User
from olea_common.schemas import SavedPredictionResponse

router = APIRouter(tags=["history"])


@router.get("/predictions/me", response_model=list[SavedPredictionResponse])
def get_my_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.user_id == current_user.id)
        .order_by(PredictionHistory.created_at.desc())
        .limit(30)
        .all()
    )

    return [
        {
            "id": row.id,
            "recommended_bundle_id": row.recommended_bundle_id,
            "confidence": row.confidence,
            "created_at": row.created_at.isoformat(),
            "input_payload": row.input_payload,
            "output_payload": row.output_payload,
        }
        for row in rows
    ]
