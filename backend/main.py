from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, ChatHistory
from schemas import ChatRequest, ChatResponse
from rag_model import RAG_Solution

Base.metadata.create_all(bind=engine)

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

@app.post("/rag", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    answer = RAG_Solution(request.question, temperature=request.temperature)
    chat_entry = ChatHistory(
        user_message=request.question,
        ai_response=answer
    )
    db.add(chat_entry)
    db.commit()
    return {"response": answer}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)