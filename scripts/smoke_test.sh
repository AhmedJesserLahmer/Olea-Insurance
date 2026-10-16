#!/usr/bin/env bash
# Smoke test against a running stack (docker compose or Kubernetes), through the gateway/Ingress.
#   BASE_URL=http://localhost:8080 ./scripts/smoke_test.sh
# Set SMOKE_RAG=1 to also require a RAG answer (needs PINECONE_API_KEY and several GB of RAM).
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
TIMEOUT="${SMOKE_TIMEOUT:-120}"

pass() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; exit 1; }
json() { python3 -c "import sys, json; print(json.load(sys.stdin)$1)"; }

echo "Smoke testing $BASE_URL"

# 1. Gateway and services are up
deadline=$((SECONDS + TIMEOUT))
until curl -fsS "$BASE_URL/gateway/health" > /dev/null 2>&1 || curl -fsS "$BASE_URL/" > /dev/null 2>&1; do
  [ $SECONDS -lt $deadline ] || fail "gateway not reachable after ${TIMEOUT}s"
  sleep 2
done
pass "gateway reachable"

curl -fsS "$BASE_URL/" | grep -q "Get a direct access here" || fail "frontend page missing the direct access button"
pass "frontend served"

# 2. Accounts (api-svc)
DEMO_TOKEN=$(curl -fsS -X POST "$BASE_URL/auth/demo" | json "['access_token']") || fail "demo access"
pass "demo access"

EMAIL="smoke-$(date +%s)-$RANDOM@example.com"
curl -fsS -X POST "$BASE_URL/auth/signup" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"full_name\":\"Smoke Test\",\"password\":\"smoke-pass-123\"}" > /dev/null || fail "signup"
TOKEN=$(curl -fsS -X POST "$BASE_URL/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"smoke-pass-123\"}" | json "['access_token']") || fail "login"
AUTH="Authorization: Bearer $TOKEN"
pass "signup + login"

[ "$(curl -fsS "$BASE_URL/auth/me" -H "$AUTH" | json "['email']")" = "$EMAIL" ] || fail "/auth/me"
pass "/auth/me"

# 3. Prediction (prediction-svc) and history via Kafka -> history-writer -> PostgreSQL
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/predict-bundle" -H 'Content-Type: application/json' -d '{"age":40,"annual_income":60000}')
[ "$code" = 401 ] || fail "unauthenticated prediction returned $code, expected 401"
pass "prediction requires auth"

BUNDLE=$(curl -fsS -X POST "$BASE_URL/predict-bundle" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"age":40,"annual_income":60000,"child_dependents":2}' | json "['recommended_bundle_name']") || fail "prediction"
pass "prediction: $BUNDLE"

deadline=$((SECONDS + 30))
until [ "$(curl -fsS "$BASE_URL/predictions/me" -H "$AUTH" | json ".__len__()")" -ge 1 ]; do
  [ $SECONDS -lt $deadline ] || fail "prediction never reached history (Kafka / history-writer)"
  sleep 1
done
pass "prediction stored in history"

# 4. RAG (rag-svc): optional, needs Pinecone credentials
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 300 -X POST "$BASE_URL/rag" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"question":"What does Basic Health cover?"}')
if [ "${SMOKE_RAG:-0}" = 1 ]; then
  [ "$code" = 200 ] || fail "RAG returned $code"
  pass "RAG answer"
else
  [ "$code" = 200 ] || [ "$code" = 500 ] || fail "RAG service unreachable (HTTP $code)"
  pass "RAG service reachable (HTTP $code; set SMOKE_RAG=1 to require an answer)"
fi

echo "All smoke tests passed."
