import logging
from typing import Iterable

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app(title: str, routers: Iterable[APIRouter], *, init_database: bool = False) -> FastAPI:
    if init_database:
        from olea_common.db_init import init_db
        from olea_common.database import SessionLocal
        from olea_common.seed import demo_mode_enabled, seed_demo_data

        init_db()
        if demo_mode_enabled():
            from sqlalchemy.exc import IntegrityError

            with SessionLocal() as seed_session:
                try:
                    seed_demo_data(seed_session)
                except IntegrityError:
                    # Another replica seeded at the same moment; its data is already there
                    seed_session.rollback()
                    logging.getLogger("olea.seed").info("Demo data already seeded by another replica")

    app = FastAPI(title=title)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for router in routers:
        app.include_router(router)
    return app
