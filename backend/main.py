from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, ChatHistory, User, PredictionHistory
from schemas import (
    ChatRequest,
    ChatResponse,
    PredictBundleRequest,
    PredictBundleResponse,
    SignUpRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    SavedPredictionResponse,
)
from bundle_model import predict_bundle
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from seed import DEMO_EMAIL, demo_mode_enabled, seed_demo_data
from db_init import init_db

init_db()

if demo_mode_enabled():
    with SessionLocal() as seed_session:
        seed_demo_data(seed_session)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return {"status": "ok"}


@app.post("/rag", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Lazy import keeps backend alive even when external RAG dependencies are not available.
        from rag_model import RAG_Solution

        answer = RAG_Solution(request.question, temperature=request.temperature)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG service unavailable: {exc}") from exc

    chat_entry = ChatHistory(
        user_message=request.question,
        ai_response=answer,
    )
    db.add(chat_entry)
    db.commit()
    return {"response": answer}


@app.post("/predict-bundle", response_model=PredictBundleResponse)
def predict(
    request: PredictBundleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        input_payload = request.model_dump()
        prediction = predict_bundle(input_payload)

        prediction_entry = PredictionHistory(
            user_id=current_user.id,
            input_payload=input_payload,
            output_payload=prediction,
            recommended_bundle_id=prediction["recommended_bundle_id"],
            confidence=prediction["confidence"],
        )
        db.add(prediction_entry)
        db.commit()

        return prediction
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction service unavailable: {exc}") from exc


@app.post("/auth/signup", response_model=UserResponse)
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


@app.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }


@app.post("/auth/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    if not demo_mode_enabled():
        raise HTTPException(status_code=404, detail="Direct access is disabled")

    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        seed_demo_data(db)
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()

    token = create_access_token(subject=user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "full_name": current_user.full_name}


@app.get("/predictions/me", response_model=list[SavedPredictionResponse])
def get_my_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.user_id == current_user.id)
        .order_by(PredictionHistory.created_at.desc())
        .limit(30)
        .all()
    )

    return [
        {
            "id": row.id,
            "recommended_bundle_id": row.recommended_bundle_id,
            "confidence": row.confidence,
            "created_at": row.created_at.isoformat(),
            "input_payload": row.input_payload,
            "output_payload": row.output_payload,
        }
        for row in rows
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)