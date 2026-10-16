"""prediction-svc: runs model.pkl and publishes profile + prediction events."""
from app_factory import create_app
from bundle_model import _load_assets
from routers import predictions
from routers.health import make_health_router

# Load the model before accepting traffic, so a ready pod can answer at once
_load_assets()

app = create_app("Olea prediction-svc", [make_health_router(check_database=False), predictions.router])
