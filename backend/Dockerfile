# One Dockerfile, one image per service. Build from the repository root:
#   docker build -f backend/Dockerfile --target api            -t olea-api .
#   docker build -f backend/Dockerfile --target prediction     -t olea-prediction .
#   docker build -f backend/Dockerfile --target rag            -t olea-rag .
#   docker build -f backend/Dockerfile --target history-writer -t olea-history-writer .
#   docker build -f backend/Dockerfile --target all            -t olea-all .   (all-in-one main.py)

# ---- Shared base: web, database, auth and Kafka client
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HEALTH_URL=http://localhost:8000/health

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 olea

WORKDIR /app
COPY backend/requirements/ backend/requirements/
RUN pip install -r backend/requirements/base.txt

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -fsS "$HEALTH_URL" || exit 1

# ---- api-svc: accounts + history
FROM base AS api
COPY --chown=olea:olea backend/ backend/
USER olea
WORKDIR /app/backend
ENV SERVICE_NAME=api-svc
EXPOSE 8000
CMD ["uvicorn", "api_service:app", "--host", "0.0.0.0", "--port", "8000"]

# ---- history-writer: Kafka consumer
FROM base AS history-writer
COPY --chown=olea:olea backend/ backend/
USER olea
WORKDIR /app/backend
ENV SERVICE_NAME=history-writer \
    HEALTH_URL=http://localhost:8081/health
EXPOSE 8081
CMD ["python", "history_writer.py"]

# ---- Model stack (lightgbm needs libgomp1)
FROM base AS prediction-deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
RUN pip install -r backend/requirements/prediction.txt
# bundle_model.py loads these from the repository root (/app)
COPY model.pkl DataQuest-Brief-Document.pdf ./

# ---- prediction-svc
FROM prediction-deps AS prediction
COPY --chown=olea:olea backend/ backend/
USER olea
WORKDIR /app/backend
ENV SERVICE_NAME=prediction-svc
EXPOSE 8000
CMD ["uvicorn", "prediction_service:app", "--host", "0.0.0.0", "--port", "8000"]

# ---- rag-svc: CPU-only torch keeps the image a few GB smaller than the CUDA build
FROM base AS rag-deps
ENV HF_HOME=/app/.cache/huggingface
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r backend/requirements/rag.txt \
    && mkdir -p "$HF_HOME" && chown -R olea:olea /app/.cache

FROM rag-deps AS rag
COPY --chown=olea:olea backend/ backend/
USER olea
WORKDIR /app/backend
ENV SERVICE_NAME=rag-svc
EXPOSE 8000
CMD ["uvicorn", "rag_service:app", "--host", "0.0.0.0", "--port", "8000"]

# ---- all-in-one main.py (every route in one process)
FROM prediction-deps AS all
ENV HF_HOME=/app/.cache/huggingface
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r backend/requirements/rag.txt \
    && mkdir -p "$HF_HOME" && chown -R olea:olea /app/.cache
COPY --chown=olea:olea backend/ backend/
USER olea
WORKDIR /app/backend
ENV SERVICE_NAME=olea-all
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
