from pydantic import BaseModel

class ChatRequest(BaseModel):
    question: str
    temperature: float = 0.2

class ChatResponse(BaseModel):
    response: str
