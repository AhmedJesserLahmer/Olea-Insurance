import logging
from typing import Iterable

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app(title: str, routers: Iterable[APIRouter], *, init_database: bool = False) -> FastAPI:
    if init_database:
        from db_init import init_db
        from database import SessionLocal
        from seed import demo_mode_enabled, seed_demo_data

        init_db()
        if demo_mode_enabled():
            with SessionLocal() as seed_session:
                seed_demo_data(seed_session)

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
