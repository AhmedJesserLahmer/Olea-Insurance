# all-in-one: every route in one process (Render, simple deployments)
# Build from services/ (the shared package lives next to it):
#   docker build -f all-in-one/Dockerfile -t olea-all .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/shared:/app/api:/app/prediction:/app/rag:/app/all-in-one \
    SERVICE_NAME=olea-all

# libgomp1 is required by lightgbm
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 olea

WORKDIR /app

ENV HF_HOME=/app/.cache/huggingface
# Dependencies first: cached until a requirements file changes
COPY shared/requirements.txt shared/requirements.txt
COPY prediction/requirements.txt prediction/requirements.txt
COPY rag/requirements.txt rag/requirements.txt
COPY all-in-one/requirements.txt all-in-one/requirements.txt
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r all-in-one/requirements.txt
RUN mkdir -p "$HF_HOME" && chown -R olea:olea /app/.cache
COPY prediction/model.pkl prediction/DataQuest-Brief-Document.pdf prediction/

# Code last: a code change only rebuilds these layers
COPY shared/olea_common shared/olea_common
COPY api/olea_api api/olea_api
COPY prediction/olea_prediction prediction/olea_prediction
COPY rag/olea_rag rag/olea_rag
COPY all-in-one/olea_all all-in-one/olea_all

USER olea
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Render (and similar platforms) pass the port in $PORT
CMD ["sh", "-c", "exec uvicorn olea_all.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
