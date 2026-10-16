"""All-in-one API: every route in a single process (Render, simple local runs).

In Kubernetes and docker compose the same routes are split across
api_service.py, prediction_service.py and rag_service.py.
"""
from app_factory import create_app
from routers import accounts, chat, history, predictions
from routers.health import make_health_router

app = create_app(
    "Olea Insurance API",
    [make_health_router(check_database=True), accounts.router, history.router, predictions.router, chat.router],
    init_database=True,
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
