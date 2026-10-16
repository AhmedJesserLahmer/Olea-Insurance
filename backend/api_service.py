"""api-svc: accounts and history. Owns the schema and the demo seed."""
from app_factory import create_app
from routers import accounts, history
from routers.health import make_health_router

app = create_app(
    "Olea api-svc",
    [make_health_router(check_database=True), accounts.router, history.router],
    init_database=True,
)
