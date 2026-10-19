"""api-svc: accounts and history. Owns the schema and the demo seed."""
from olea_common.app_factory import create_app
from olea_api import accounts, history
from olea_common.health import make_health_router

app = create_app(
    "Olea api-svc",
    [make_health_router(check_database=True), accounts.router, history.router],
    init_database=True,
)
