from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, get_password_hash, verify_password
from database import get_db
from models import User
from schemas import LoginRequest, SignUpRequest, TokenResponse, UserResponse
from seed import DEMO_EMAIL, demo_mode_enabled, seed_demo_data

router = APIRouter(tags=["accounts"])


def _token_response(user: User) -> dict:
    return {
        "access_token": create_access_token(subject=user.email, user_id=user.id),
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }


@router.post("/auth/signup", response_model=UserResponse)
def signup(request: SignUpRequest, db: Session = Depends(get_db)):
    try:
        existing = db.query(User).filter(User.email == request.email.lower().strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=request.email.lower().strip(),
            full_name=request.full_name.strip(),
            hashed_password=get_password_hash(request.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return {"id": user.id, "email": user.email, "full_name": user.full_name}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Signup failed: {exc}") from exc


@router.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return _token_response(user)


@router.post("/auth/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    if not demo_mode_enabled():
        raise HTTPException(status_code=404, detail="Direct access is disabled")

    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        seed_demo_data(db)
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()

    return _token_response(user)


@router.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "full_name": current_user.full_name}
