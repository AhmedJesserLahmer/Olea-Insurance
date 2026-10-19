"""rag-svc: answers insurance questions (Pinecone + TinyLlama) and publishes chat events.

The RAG pipeline loads on the first question, so the pod starts quickly and
/health stays up even when Pinecone is not configured.
"""
from olea_common.app_factory import create_app
from olea_rag import routes
from olea_common.health import make_health_router

app = create_app("Olea rag-svc", [make_health_router(check_database=False), routes.router])
