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

## 🏗️ Architecture & Planning

Instead of heavy enterprise documentation, we utilized a streamlined architecture designed for rapid deployment and a clear separation of concerns between our ML and RAG inference capabilities.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant AI
    participant DB

    User->>Frontend: Fill profile and submit
    Frontend->>Backend: POST /prediction with token
    Backend->>Backend: Validate schema and auth
    Backend->>AI: predict(payload)
    AI-->>Backend: recommendation
    Backend->>DB: Save prediction history
    Backend-->>Frontend: Prediction response
    Frontend-->>User: Render bundle and confidence
```

## 🛠️ Tools & Tech Stack

Our stack was carefully selected to optimize performance and reduce friction during ML integration:

- **Frontend:** Next.js (App Router) + React
- **Backend (API Layer):** FastAPI (Python)
- **Database:** PostgreSQL via SQLAlchemy ORM (psycopg2)
- **Machine Learning:** Scikit-learn (`model.pkl` using XGBClassifier to predict bundle probabilities)
- **Generative AI (RAG):** Pinecone (Vector database) + Embedding model + TinyLlama
- **DevOps & Cloud Deployment:** Docker, GitHub Actions (CI/CD Pipeline), Vercel (Frontend Hosting), Render (Backend Hosting)

## ⚙️ Local Setup

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



