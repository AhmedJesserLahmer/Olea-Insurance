# prediction-svc: runs model.pkl and publishes profile + prediction events
# Build from services/ (the shared package lives next to it):
#   docker build -f prediction/Dockerfile -t olea-prediction .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/shared:/app/prediction \
    SERVICE_NAME=prediction-svc

# libgomp1 is required by lightgbm
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 olea

WORKDIR /app

# Dependencies first: cached until a requirements file changes
COPY shared/requirements.txt shared/requirements.txt
COPY prediction/requirements.txt prediction/requirements.txt
RUN pip install -r prediction/requirements.txt

# The model and the PDF brief (bundle_model.py loads them from /app/prediction)
COPY prediction/model.pkl prediction/DataQuest-Brief-Document.pdf prediction/

# Code last: a code change only rebuilds these layers
COPY shared/olea_common shared/olea_common
COPY prediction/olea_prediction prediction/olea_prediction

USER olea
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "olea_prediction.app:app", "--host", "0.0.0.0", "--port", "8000"]
