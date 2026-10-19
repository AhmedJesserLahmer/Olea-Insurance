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
| api-svc | [`services/api`](services/api) | `/auth/*`, `/predictions/me` | Accounts, history; owns the schema and demo seed |
| prediction-svc | [`services/prediction`](services/prediction) | `/predict-bundle` | Runs `model.pkl`, publishes `client.profile.submitted` + `prediction.completed` |
| rag-svc | [`services/rag`](services/rag) | `/rag` | Pinecone + TinyLlama, publishes `chat.completed` |
| history-writer | [`services/history-writer`](services/history-writer) | — | Kafka consumer → PostgreSQL |

- **Exactly-once storage:** each event has an `event_id`; Kafka may redeliver, but
  [`persistence.apply_event`](services/shared/olea_common/persistence.py) stores each id once. Unstorable messages go to `history.dead-letter`.
- **No Kafka? No problem:** without `KAFKA_BOOTSTRAP_SERVERS` (or if Kafka does not acknowledge an event)
  events are written directly to PostgreSQL. The [all-in-one app](services/all-in-one) (used on Render) works this way.
- **Stateless auth:** tokens carry the user id, so prediction-svc and rag-svc verify them without a database lookup.

How a request reaches a pod across the cluster's nodes: [docs/kubernetes-request-flow.svg](docs/kubernetes-request-flow.svg).

## 🗂️ Project structure

```
frontend/                      Next.js UI
services/                      Python services (FastAPI), one folder each
├── shared/olea_common/        code every service uses: database, models, auth, events, persistence, seed
├── api/                       api-svc: accounts + history
├── prediction/                prediction-svc: model.pkl + the PDF brief
├── rag/                       rag-svc: RAG chat
├── history-writer/            Kafka consumer → PostgreSQL
└── all-in-one/                every route in one process (Render)
infrastructure/
├── helm/olea/                 Kubernetes chart (production + local values)
├── nginx/                     docker compose gateway (stand-in for the Ingress)
└── scripts/                   k8s_local.sh, smoke_test.sh
docker-compose.yml             local stack: PostgreSQL, Kafka, the services, the gateway
.github/workflows/ci-cd.yml    tests → smoke tests → Docker Hub → Helm deploy
docs/                          architecture diagrams
```

Each service folder holds its package (`olea_<service>/`), `Dockerfile`, `requirements.txt` and `tests/`.
Services import only `olea_common` and their own package; images are built with `services/` as the context.

## 🛠️ Tools & Tech Stack

Our stack was carefully selected to optimize performance and reduce friction during ML integration:

- **Frontend:** Next.js (App Router) + React
- **Backend:** FastAPI (Python) services
- **Database:** PostgreSQL via SQLAlchemy ORM (psycopg2)
- **Messaging:** Apache Kafka (KRaft) with a PostgreSQL history-writer consumer
- **Machine Learning:** LightGBM ensemble in `model.pkl` (scikit-learn 1.8 preprocessing)
- **Generative AI (RAG):** Pinecone (Vector database) + Embedding model + TinyLlama
- **DevOps:** Docker, docker compose, Kubernetes (Helm) + NGINX Ingress, GitHub Actions → Docker Hub (CI/CD); Vercel + Render for the all-in-one deployment

## 🐳 Run locally with Docker

```bash
cp .env.example .env      # set POSTGRES_PASSWORD, JWT_SECRET_KEY, PINECONE_API_KEY
docker compose up --build
./infrastructure/scripts/smoke_test.sh   # end-to-end check through the gateway
```

Open **http://localhost:8080**. The NGINX gateway routes paths like the Kubernetes Ingress does.
PostgreSQL is also exposed on `localhost:5432` for inspection.

> ⚠️ The rag image installs torch and transformers: the first build downloads several GB and needs free RAM.
> Every container has a memory cap; the RAG service is capped at `RAG_MEMORY_LIMIT` (default `6g`).
> Without `PINECONE_API_KEY` the chat returns an error, everything else works.

## 🧪 Tests

```bash
cd services
pip install -r requirements-dev.txt
pytest                    # every service's tests, on SQLite: no PostgreSQL or Kafka needed
pytest api/tests          # one service only
```

## 🚦 CI/CD

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs on every push and pull request:

1. **Unit tests**: every service's `pytest`, the frontend production build, and Helm chart lint/render
2. **Smoke tests**: the full docker compose stack and `infrastructure/scripts/smoke_test.sh`
3. **Build & push** (`main` only): 5 images to Docker Hub, each from its service's Dockerfile, tagged with the commit SHA and `latest`
4. **Deploy** (`main`, opt-in): `helm upgrade --install --atomic` with the commit tag; a failed rollout rolls the release back

Repository settings: secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and for deploys `KUBE_CONFIG`
(base64 kubeconfig) plus the variable `DEPLOY_ENABLED=true`.

## ☸️ Kubernetes (Helm)

The chart in [`infrastructure/helm/olea`](infrastructure/helm/olea) deploys PostgreSQL, Kafka (KRaft), the five services and the Ingress.
[`values.yaml`](infrastructure/helm/olea/values.yaml) holds the production defaults (3 Kafka brokers, 2 replicas per service);
[`values-local.yaml`](infrastructure/helm/olea/values-local.yaml) shrinks everything for a laptop.

**Local cluster (Docker Desktop):** enable Kubernetes in Docker Desktop → Settings → Kubernetes
(the *kind* option gives several nodes), install [`kubectl`](https://kubernetes.io/docs/tasks/tools/)
and [`helm`](https://helm.sh/docs/intro/install/), build the images once with `docker compose build`, then:

```bash
./infrastructure/scripts/k8s_local.sh up        # ingress-nginx + the chart, secrets taken from .env
BASE_URL=http://localhost:8090 ./infrastructure/scripts/smoke_test.sh
./infrastructure/scripts/k8s_local.sh status    # nodes and pods
./infrastructure/scripts/k8s_local.sh down
```

| What | Where |
|---|---|
| App, through the real NGINX Ingress Controller | **http://localhost:8090** (Docker Desktop's load balancer stands in for the cloud one) |
| Cluster PostgreSQL, for pgAdmin / psql | `localhost:5433`, credentials from `.env` (docker compose's database stays on 5432) |
| Pods, Services, logs | `kubectl get pods -n olea`, or the [Headlamp](https://headlamp.dev) desktop app → cluster `docker-desktop` |

**Day to day:**

| Situation | Command |
|---|---|
| After a reboot / Docker Desktop start | Nothing to do: the cluster and pods come back, data is kept |
| After changing code | `docker compose build <services>` then `./infrastructure/scripts/k8s_local.sh up` (only changed images roll out) |
| Restart pods without changes | `kubectl -n olea rollout restart deployment` |
| Remove the app (keeps data) | `./infrastructure/scripts/k8s_local.sh down` |

About **5 GB** of Docker Desktop memory (Settings → Resources) fits the 3-node cluster on a 14–16 GB laptop;
much more starves the host and slows everything down. Run either the cluster or the compose stack, not both.
Local images get content-based tags, so a restart needs no image pulls and a rebuilt image always rolls out.
Use Headlamp's **desktop app** rather than the Docker Desktop extension: the extension runs in a container,
where the kubeconfig's `127.0.0.1` API address does not reach the cluster ("Bad Gateway").

**Production cluster:**

```bash
# 1. ingress-nginx controller
helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx \
  -n ingress-nginx --create-namespace
# 2. Secrets (never committed)
kubectl create namespace olea
kubectl -n olea create secret generic olea-secrets \
  --from-literal=POSTGRES_USER=olea \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
  --from-literal=POSTGRES_DB=olea \
  --from-literal=JWT_SECRET_KEY="$(openssl rand -hex 32)" \
  --from-literal=PINECONE_API_KEY=<your key>
# 3. The app (CI runs this step on every push to main, with the commit's image tag)
helm upgrade --install olea infrastructure/helm/olea -n olea \
  --set imageRegistry=docker.io/<dockerhub user> --set ingress.host=<your domain> --atomic
```

Demo mode is off in the production values (no demo accounts, no passwordless access); pass
`--set config.DEMO_MODE=true` only for a private showcase cluster. The Ingress serves plain HTTP;
add [cert-manager](https://cert-manager.io) for HTTPS once a domain points at the cluster.

## ⚙️ Local Setup without Docker (all-in-one)

**Database (PostgreSQL)**

```bash
createdb olea   # or use any hosted PostgreSQL instance
```

**Backend (all-in-one app)**

```bash
cd services
cp all-in-one/.env.example .env   # set DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/olea
pip install -r all-in-one/requirements.txt
PYTHONPATH=shared:api:prediction:rag:all-in-one uvicorn olea_all.app:app --reload
```

**On Render:** create a *Docker* web service with Dockerfile path `services/all-in-one/Dockerfile` and
build context `services`; it listens on Render's `$PORT`. Set `DATABASE_URL`, `JWT_SECRET_KEY` and
`DEMO_MODE=false` in its environment.

Tables are created automatically on startup. With `DEMO_MODE=true` (the default in `.env.example` and
`values-local.yaml`; **off** in the production Helm values) the database is also
seeded with mock data from [`seed.py`](services/shared/olea_common/seed.py): a demo account, two sample users,
saved predictions and chat history. Seed manually with `cd services && PYTHONPATH=shared python -m olea_common.seed`.

| Account | Email | Password |
|---|---|---|
| Demo | `demo@olea.com` | `OleaDemo2026!` |
| Sample | `sarah.benali@example.com` | `Password123!` |
| Sample | `youssef.trabelsi@example.com` | `Password123!` |

The **"Get a direct access here"** button on the main page signs in as the demo account without a password.
Keep `DEMO_MODE=false` on any public deployment (Render included): it disables both the seed and direct access.

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



