# api-svc: accounts and history; creates the schema and seeds demo data
# Build from services/ (the shared package lives next to it):
#   docker build -f api/Dockerfile -t olea-api .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/shared:/app/api \
    SERVICE_NAME=api-svc

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 olea

WORKDIR /app

# Dependencies first: cached until a requirements file changes
COPY shared/requirements.txt shared/requirements.txt
COPY api/requirements.txt api/requirements.txt
RUN pip install -r api/requirements.txt

# Code last: a code change only rebuilds these layers
COPY shared/olea_common shared/olea_common
COPY api/olea_api api/olea_api

USER olea
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "olea_api.app:app", "--host", "0.0.0.0", "--port", "8000"]
