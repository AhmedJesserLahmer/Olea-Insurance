"""prediction-svc: runs model.pkl and publishes profile + prediction events."""
from olea_common.app_factory import create_app
from olea_prediction import routes
from olea_prediction.bundle_model import _load_assets
from olea_common.health import make_health_router

# Load the model before accepting traffic, so a ready pod can answer at once
_load_assets()

app = create_app("Olea prediction-svc", [make_health_router(check_database=False), routes.router])
