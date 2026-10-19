# history-writer: Kafka consumer storing events in PostgreSQL
# Build from services/ (the shared package lives next to it):
#   docker build -f history-writer/Dockerfile -t olea-history-writer .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/shared:/app/history-writer \
    SERVICE_NAME=history-writer

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 olea

WORKDIR /app

# Dependencies first: cached until a requirements file changes
COPY shared/requirements.txt shared/requirements.txt
COPY history-writer/requirements.txt history-writer/requirements.txt
RUN pip install -r history-writer/requirements.txt

# Code last: a code change only rebuilds these layers
COPY shared/olea_common shared/olea_common
COPY history-writer/olea_history_writer history-writer/olea_history_writer

USER olea
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://localhost:8081/health || exit 1

CMD ["python", "-m", "olea_history_writer.worker"]
