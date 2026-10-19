"""All-in-one API: every service's routes in a single process (Render, simple local runs).

In Kubernetes and docker compose the same routes run as separate services:
olea_api (api-svc), olea_prediction (prediction-svc) and olea_rag (rag-svc).
"""
from olea_api import accounts, history
from olea_common.app_factory import create_app
from olea_common.health import make_health_router
from olea_prediction import routes as predictions
from olea_rag import routes as chat

app = create_app(
    "Olea Insurance API",
    [make_health_router(check_database=True), accounts.router, history.router, predictions.router, chat.router],
    init_database=True,
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
