from fastapi import APIRouter, HTTPException
from sqlalchemy import text


def make_health_router(check_database: bool) -> APIRouter:
    router = APIRouter(tags=["health"])

    @router.get("/health")
    def health():
        if check_database:
            from database import SessionLocal

            try:
                with SessionLocal() as db:
                    db.execute(text("SELECT 1"))
            except Exception as exc:
                raise HTTPException(status_code=503, detail="Database unavailable") from exc
        return {"status": "ok"}

    return router
