# Build from the repository root: docker build -f backend/Dockerfile .
# (bundle_model.py loads model.pkl and the PDF brief from the repo root)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface

# libgomp1 is required by lightgbm
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only torch keeps the image a few GB smaller than the default CUDA build
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r backend/requirements.txt

COPY model.pkl DataQuest-Brief-Document.pdf ./
COPY backend/ backend/

RUN useradd --create-home --uid 1000 olea \
    && mkdir -p "$HF_HOME" \
    && chown -R olea:olea /app
USER olea

WORKDIR /app/backend
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
