# rag-svc: Pinecone + TinyLlama chat; CPU-only torch keeps the image a few GB smaller
# Build from services/ (the shared package lives next to it):
#   docker build -f rag/Dockerfile -t olea-rag .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/shared:/app/rag \
    SERVICE_NAME=rag-svc

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 olea

WORKDIR /app

ENV HF_HOME=/app/.cache/huggingface
# Dependencies first: cached until a requirements file changes
COPY shared/requirements.txt shared/requirements.txt
COPY rag/requirements.txt rag/requirements.txt
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r rag/requirements.txt
RUN mkdir -p "$HF_HOME" && chown -R olea:olea /app/.cache

# Code last: a code change only rebuilds these layers
COPY shared/olea_common shared/olea_common
COPY rag/olea_rag rag/olea_rag

USER olea
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "olea_rag.app:app", "--host", "0.0.0.0", "--port", "8000"]
