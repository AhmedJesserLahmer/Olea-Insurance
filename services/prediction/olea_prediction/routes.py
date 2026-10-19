from fastapi import APIRouter, Depends, HTTPException

from olea_common.auth import TokenUser, get_token_user
from olea_prediction.bundle_model import predict_bundle
from olea_common.events import publisher
from olea_common.persistence import TOPIC_PREDICTION_COMPLETED, TOPIC_PROFILE_SUBMITTED, make_event
from olea_common.schemas import PredictBundleRequest, PredictBundleResponse

router = APIRouter(tags=["predictions"])


@router.post("/predict-bundle", response_model=PredictBundleResponse)
def predict(request: PredictBundleRequest, current_user: TokenUser = Depends(get_token_user)):
    profile = request.model_dump()
    # The submitted profile is recorded even if the model fails afterwards
    publisher.publish(make_event(TOPIC_PROFILE_SUBMITTED, current_user.id, {"profile": profile}))

    try:
        prediction = predict_bundle(profile)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction service unavailable: {exc}") from exc

    publisher.publish(
        make_event(TOPIC_PREDICTION_COMPLETED, current_user.id, {"profile": profile, "prediction": prediction})
    )
    return prediction
