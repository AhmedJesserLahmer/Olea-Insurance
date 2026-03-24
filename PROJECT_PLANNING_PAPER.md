# Insurance AI Project Planning Paper

## 1. Should you do UML first?

Yes, but keep it lightweight.

You do not need heavy enterprise documentation. For this project, a small UML package will save rework and make coding faster.

Recommended UML set:

1. Use Case Diagram: who uses the system and what they do.
2. Class Diagram: backend entities and relationships.
3. Sequence Diagrams: key flows like signup, login, predict bundle, and RAG chat.
4. Component Diagram: frontend, backend, database, model file, vector database.

## 2. Should you write a step paper?

Yes. A clear step paper is your execution map.

What it gives you:

1. Better focus: no random coding order.
2. Less refactoring: interfaces are defined early.
3. Faster debugging: each phase has clear expected outputs.
4. Better presentation: easier to explain your project to mentors, recruiters, or judges.

## 3. Project Goal Statement

Build a full-stack insurance recommendation assistant that:

1. Authenticates users securely.
2. Predicts best insurance bundle from profile data.
3. Stores user prediction history.
4. Answers insurance questions using a RAG pipeline.
5. Exposes robust backend APIs for frontend consumption.

## 4. System Scope

In scope:

1. User authentication (signup, login, me).
2. Bundle prediction endpoint.
3. Prediction history endpoint.
4. RAG endpoint.
5. Dockerized backend + database.

Out of scope for first version:

1. Full admin panel.
2. Advanced billing flows.
3. Multi-tenant architecture.
4. Real-time chat streaming.

## 5. Architecture Overview

Main components:

1. Frontend (React + Vite): collects user input and displays results.
2. Backend (FastAPI): business logic and API layer.
3. Database (MySQL via SQLAlchemy): users, chat history, prediction history.
4. ML model (model.pkl): predicts bundle probabilities.
5. RAG stack (Pinecone + embedding model + TinyLlama): contextual insurance answers.

Data flow summary:

1. User sends input from frontend.
2. Backend validates input with Pydantic schemas.
3. Backend runs prediction or RAG pipeline.
4. Backend stores history in DB.
5. Backend returns structured response.

## 6. Lightweight UML Specification

### 6.1 Use Cases

Actors:

1. Visitor.
2. Authenticated User.

Visitor use cases:

1. Sign up.
2. Log in.

Authenticated User use cases:

1. Request bundle recommendation.
2. Ask insurance question via chat.
3. View own prediction history.
4. View own profile.

### 6.2 Class Diagram (conceptual)

Core classes/entities:

1. User:
1. id, email, full_name, hashed_password, created_at
1. ChatHistory:
1. id, user_message, ai_response
1. PredictionHistory:
1. id, user_id, input_payload, output_payload, recommended_bundle_id, confidence, created_at

Relationships:

1. User 1..\* PredictionHistory
2. ChatHistory currently independent in DB model

### 6.3 Sequence Diagram Flows

Signup flow:

1. Frontend sends signup data.
2. Backend checks existing email.
3. Backend hashes password.
4. Backend creates user.
5. Backend returns user profile.

Login flow:

1. Frontend sends credentials.
2. Backend verifies password.
3. Backend issues JWT.
4. Frontend stores token.

Predict flow:

1. Frontend sends profile + token.
2. Backend validates token.
3. Backend builds feature row.
4. Backend computes probabilities.
5. Backend stores prediction history.
6. Backend returns recommendation and reasoning.

RAG flow:

1. Frontend sends question + token.
2. Backend retrieves context from vector store.
3. Backend prompts LLM with rules + context.
4. Backend stores chat entry.
5. Backend returns answer.

## 7. Implementation Plan (Best Coding Order)

### Phase 1: Foundations

1. Define environment variables and dependency list.
2. Set up database connection module.
3. Create ORM models.
4. Create schema contracts.

Deliverable:
Backend can import without errors and create tables.

### Phase 2: Security and Auth

1. Implement password hashing and verification.
2. Implement JWT creation and validation.
3. Build signup/login/me endpoints.

Deliverable:
User can sign up, log in, and call protected endpoint with bearer token.

### Phase 3: Core AI Features

1. Implement bundle prediction pipeline.
2. Implement prediction endpoint.
3. Persist prediction history.

Deliverable:
Prediction endpoint returns ranked bundles and stores history.

### Phase 4: RAG Feature

1. Implement retrieval setup and vector store connection.
2. Implement LLM loading and prompt strategy.
3. Implement chat endpoint and chat persistence.

Deliverable:
RAG endpoint returns contextual insurance answers.

### Phase 5: Integration and Deployment

1. Add Dockerfile.
2. Add docker-compose for backend + MySQL.
3. Verify health and environment config.
4. Finalize frontend integration.

Deliverable:
App runs locally via Docker and frontend can consume backend APIs.

## 8. Milestones and Acceptance Criteria

Milestone A: Auth complete

1. Signup returns created user.
2. Login returns JWT.
3. Me endpoint returns authenticated profile.

Milestone B: Prediction complete

1. Valid request returns recommended bundle and confidence.
2. Prediction stored with user_id.
3. Predictions list returns latest rows.

Milestone C: RAG complete

1. Insurance question gets meaningful answer.
2. Non-insurance question handled safely.
3. Chat entry stored after successful answer.

Milestone D: Deployment complete

1. Containers start reliably.
2. Backend reachable on configured port.
3. Frontend successfully calls backend endpoints.

## 9. Risk Register and Mitigation

1. Risk: Missing env keys.
   Mitigation: startup validation and .env.example.

2. Risk: LLM or Pinecone unavailable.
   Mitigation: lazy import, explicit error handling, fallback message.

3. Risk: Secret leakage.
   Mitigation: never hardcode API keys, rotate exposed keys, ignore .env in git.

4. Risk: Schema drift between frontend and backend.
   Mitigation: treat Pydantic schemas as source of truth and version API changes.

## 10. Testing Strategy

1. Unit tests:
1. auth helper functions
1. feature engineering transformations

1. Integration tests:
1. signup/login/me flow
1. predict-bundle with auth
1. predictions/me pagination and ownership

1. Manual validation:
1. Swagger endpoint checks
1. frontend end-to-end happy path

## 11. One-Week Execution Schedule

Day 1:

1. Finalize UML sketches.
2. Configure environment and DB.
3. Implement models and schemas.

Day 2:

1. Implement auth module.
2. Implement signup/login/me routes.
3. Smoke test with API client.

Day 3:

1. Implement prediction pipeline.
2. Integrate predict endpoint.
3. Save and fetch prediction history.

Day 4:

1. Implement RAG module.
2. Integrate rag endpoint.
3. Handle error cases cleanly.

Day 5:

1. Dockerize backend.
2. Configure compose with database.
3. Validate startup and migrations.

Day 6:

1. Frontend integration pass.
2. Test full user journey.
3. Fix contract mismatches.

Day 7:

1. Write final README runbook.
2. Security cleanup and secret scan.
3. Demo rehearsal and project presentation prep.

## 12. Definition of Done

Project is done when:

1. All core endpoints work with token-protected routes.
2. Prediction and RAG both return reliable responses.
3. Data persistence works for users and history.
4. Dockerized local run is stable.
5. Documentation includes setup, env vars, and endpoint examples.

## 13. Next Actions for You

1. Draw the 4 UML diagrams in simple form first.
2. Follow Phase 1 through Phase 5 exactly.
3. Do not start frontend API wiring until Milestone B is done.
4. Add tests as soon as each phase becomes stable.
