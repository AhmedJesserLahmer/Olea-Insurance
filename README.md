<div align="center">
  <img src="frontend/public/olea-sunset.svg" alt="Olea-Sunset Presentation Header" width="100%">
</div>

# Olea-Insurance

Full-stack ML application that serves real-time predictions via a FastAPI backend and Next.js front-end. Includes automated CI/CD with GitHub Actions and deployed on Vercel + Render, built during OLEA hackathon (final version).

You can check out our application yourself using this link !
https://olea-insurance.vercel.app/

## 🚀 What It Does

Olea-Insurance is a comprehensive insurance recommendation assistant that provides:

- **Secure User Authentication:** Visitor sign up, login, and secured profile access.
- **Smart Bundle Predictions:** Machine Learning-driven insurance bundle recommendations based on user profile and input data.
- **RAG-based Insurance Chat:** An AI assistant powered by a Retrieval-Augmented Generation (RAG) pipeline to dynamically answer context-specific insurance questions.
- **Prediction History:** Automatically records and retrieves user prediction and chat histories

## 🏗️ Architecture

![Target architecture](docs/architecture.svg)

The backend is split into services behind an NGINX Ingress (Kubernetes) or an NGINX gateway (docker compose).
Every profile a client submits, every prediction and every chat answer is published to **Kafka** as an
event; the **history-writer** consumes them and stores them in **PostgreSQL**.

| Service | Code | Routes | Role |
|---|---|---|---|
| frontend-svc | [`frontend/`](frontend) | `/` | Next.js UI |
| api-svc | [`api_service.py`](backend/api_service.py) | `/auth/*`, `/predictions/me` | Accounts, history; owns the schema and demo seed |
| prediction-svc | [`prediction_service.py`](backend/prediction_service.py) | `/predict-bundle` | Runs `model.pkl`, publishes `client.profile.submitted` + `prediction.completed` |
| rag-svc | [`rag_service.py`](backend/rag_service.py) | `/rag` | Pinecone + TinyLlama, publishes `chat.completed` |
| history-writer | [`history_writer.py`](backend/history_writer.py) | — | Kafka consumer → PostgreSQL |

- **Exactly-once storage:** each event has an `event_id`; Kafka may redeliver, but
  [`persistence.apply_event`](backend/persistence.py) stores each id once. Unstorable messages go to `history.dead-letter`.
- **No Kafka? No problem:** without `KAFKA_BOOTSTRAP_SERVERS` (or if Kafka does not acknowledge an event)
  events are written directly to PostgreSQL. The all-in-one [`main.py`](backend/main.py) (used on Render) works this way.
- **Stateless auth:** tokens carry the user id, so prediction-svc and rag-svc verify them without a database lookup.

How a request reaches a pod across the cluster's nodes: [docs/kubernetes-request-flow.svg](docs/kubernetes-request-flow.svg).

## 🛠️ Tools & Tech Stack

Our stack was carefully selected to optimize performance and reduce friction during ML integration:

- **Frontend:** Next.js (App Router) + React
- **Backend:** FastAPI (Python) services
- **Database:** PostgreSQL via SQLAlchemy ORM (psycopg2)
- **Messaging:** Apache Kafka (KRaft) with a PostgreSQL history-writer consumer
- **Machine Learning:** LightGBM ensemble in `model.pkl` (scikit-learn 1.8 preprocessing)
- **Generative AI (RAG):** Pinecone (Vector database) + Embedding model + TinyLlama
- **DevOps:** Docker, docker compose, Kubernetes + NGINX Ingress, GitHub Actions → Docker Hub (CI/CD); Vercel + Render for the all-in-one deployment

## 🐳 Run locally with Docker

```bash
cp .env.example .env      # set POSTGRES_PASSWORD, JWT_SECRET_KEY, PINECONE_API_KEY
docker compose up --build
./scripts/smoke_test.sh   # end-to-end check through the gateway
```

Open **http://localhost:8080**. The NGINX gateway routes paths like the Kubernetes Ingress does.
PostgreSQL is also exposed on `localhost:5432` for inspection.

> ⚠️ The rag image installs torch and transformers: the first build downloads several GB and needs free RAM.
> Every container has a memory cap; the RAG service is capped at `RAG_MEMORY_LIMIT` (default `6g`).
> Without `PINECONE_API_KEY` the chat returns an error, everything else works.

## 🧪 Tests

```bash
cd backend
pip install -r requirements/dev.txt
pytest                    # unit tests on SQLite, no PostgreSQL or Kafka needed
```

## 🚦 CI/CD

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs on every push and pull request:

1. **Unit tests**: backend `pytest` and the frontend production build
2. **Smoke tests**: the full docker compose stack and `scripts/smoke_test.sh`
3. **Build & push** (`main` only): 5 images to Docker Hub, tagged with the commit SHA and `latest`
4. **Deploy** (`main`, opt-in): `kubectl set image` to the commit tag, wait for the rollout, roll back on failure

Repository settings: secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and for deploys `KUBE_CONFIG`
(base64 kubeconfig) plus the variable `DEPLOY_ENABLED=true`.

## ☸️ Kubernetes

Manifests are in [`k8s/`](k8s): PostgreSQL, a 3-broker Kafka, the five services and the Ingress.

```bash
# 1. ingress-nginx controller: https://kubernetes.github.io/ingress-nginx/deploy/
# 2. Set your Docker Hub user in k8s/kustomization.yaml and your domain in k8s/ingress.yaml
kubectl apply -f k8s/namespace.yaml
kubectl -n olea create secret generic olea-secrets \
  --from-literal=POSTGRES_USER=olea \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
  --from-literal=POSTGRES_DB=olea \
  --from-literal=JWT_SECRET_KEY="$(openssl rand -hex 32)" \
  --from-literal=PINECONE_API_KEY=<your key>
kubectl apply -k k8s/
BASE_URL=https://olea.example.com ./scripts/smoke_test.sh
```

## ⚙️ Local Setup without Docker (all-in-one)

**Database (PostgreSQL)**

```bash
createdb olea   # or use any hosted PostgreSQL instance
```

**Backend**

```bash
cd backend
cp .env.example .env   # set DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/olea
pip install -r requirements.txt
uvicorn main:app --reload
```

Tables are created automatically on startup. With `DEMO_MODE=true` (the default) the database is also
seeded with mock data from [`backend/seed.py`](backend/seed.py): a demo account, two sample users,
saved predictions and chat history. Run `python seed.py` to seed manually.

| Account | Email | Password |
|---|---|---|
| Demo | `demo@olea.com` | `OleaDemo2026!` |
| Sample | `sarah.benali@example.com` | `Password123!` |
| Sample | `youssef.trabelsi@example.com` | `Password123!` |

The **"Get a direct access here"** button on the main page signs in as the demo account without a password.
Set `DEMO_MODE=false` in production to disable both the seed and direct access.

**Frontend**

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

On Vercel, set the project **Root Directory** to `frontend` and define `NEXT_PUBLIC_API_BASE_URL`.

## 📸 Screenshots
<img width="1915" height="1082" alt="image" src="https://github.com/user-attachments/assets/e95ce8f5-5751-4ca8-85a1-ba19706997d9" />
<img width="1918" height="1091" alt="image" src="https://github.com/user-attachments/assets/d88a9fdc-7c72-4392-827e-919d72f40af0" />



