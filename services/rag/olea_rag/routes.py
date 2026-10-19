from fastapi import APIRouter, Depends, HTTPException

from olea_common.auth import TokenUser, get_token_user
from olea_common.events import publisher
from olea_common.persistence import TOPIC_CHAT_COMPLETED, make_event
from olea_common.schemas import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])


@router.post("/rag", response_model=ChatResponse)
def chat(request: ChatRequest, current_user: TokenUser = Depends(get_token_user)):
    try:
        # Lazy import keeps the service alive even when external RAG dependencies are not available.
        from olea_rag.rag_model import RAG_Solution

        answer = RAG_Solution(request.question, temperature=request.temperature)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG service unavailable: {exc}") from exc

    publisher.publish(
        make_event(TOPIC_CHAT_COMPLETED, current_user.id, {"question": request.question, "answer": answer})
    )
    return {"response": answer}
