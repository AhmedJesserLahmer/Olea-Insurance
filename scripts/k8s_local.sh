#!/usr/bin/env bash
# Run the Helm chart on Docker Desktop's local Kubernetes.
#   ./scripts/k8s_local.sh up       install/upgrade ingress-nginx + the olea chart, then wait
#   ./scripts/k8s_local.sh status   show nodes, pods and the entry URL
#   ./scripts/k8s_local.sh down     uninstall the olea release (keeps ingress-nginx and volumes)
#
# Needs: Docker Desktop with Kubernetes enabled, kubectl, helm, and images built with
# docker compose (olea/<service>:local). Secrets are read from .env, never written to a file.
set -euo pipefail

cd "$(dirname "$0")/.."

KUBE_CONTEXT="${KUBE_CONTEXT:-docker-desktop}"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-desktop-linux}"
NAMESPACE=olea
# Host port of the local load balancer (port 80 is often taken by a local web server)
INGRESS_HTTP_PORT="${INGRESS_HTTP_PORT:-8090}"
INGRESS_HTTPS_PORT="${INGRESS_HTTPS_PORT:-8443}"
INGRESS_CHART_VERSION=4.12.1

kubectl_() { kubectl --context "$KUBE_CONTEXT" "$@"; }
helm_() { helm --kube-context "$KUBE_CONTEXT" "$@"; }

up() {
  [ -f .env ] || { echo ".env not found: cp .env.example .env and fill it in"; exit 1; }
  set -a; . ./.env; set +a

  echo "==> Tagging local images as olea-local/olea-<service>:local"
  for service in api prediction rag history-writer frontend; do
    docker --context "$DOCKER_CONTEXT" tag "olea/$service:local" "olea-local/olea-$service:local"
  done

  echo "==> ingress-nginx (load balancer on localhost:$INGRESS_HTTP_PORT)"
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx > /dev/null 2>&1 || true
  helm repo update ingress-nginx > /dev/null
  helm_ upgrade --install ingress-nginx ingress-nginx/ingress-nginx --version "$INGRESS_CHART_VERSION" \
    -n ingress-nginx --create-namespace \
    --set controller.service.ports.http="$INGRESS_HTTP_PORT" \
    --set controller.service.ports.https="$INGRESS_HTTPS_PORT" \
    --set controller.admissionWebhooks.enabled=false \
    --set controller.resources.requests.cpu=50m \
    --set controller.resources.requests.memory=96Mi \
    --set controller.resources.limits.memory=256Mi \
    --wait --timeout 5m

  echo "==> olea chart"
  helm_ upgrade --install olea helm/olea -n "$NAMESPACE" --create-namespace \
    -f helm/olea/values-local.yaml \
    --set-string secrets.values.POSTGRES_USER="$POSTGRES_USER" \
    --set-string secrets.values.POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    --set-string secrets.values.POSTGRES_DB="$POSTGRES_DB" \
    --set-string secrets.values.JWT_SECRET_KEY="$JWT_SECRET_KEY" \
    --set-string secrets.values.PINECONE_API_KEY="${PINECONE_API_KEY:-}" \
    --wait --timeout 10m

  status
}

status() {
  kubectl_ get nodes
  echo
  kubectl_ -n "$NAMESPACE" get pods -o wide
  echo
  echo "App (through the Ingress): http://localhost:$INGRESS_HTTP_PORT"
  echo "Smoke test: BASE_URL=http://localhost:$INGRESS_HTTP_PORT ./scripts/smoke_test.sh"
}

down() {
  helm_ uninstall olea -n "$NAMESPACE" || true
  echo "Persistent volumes (database, Kafka) are kept; delete them with:"
  echo "  kubectl --context $KUBE_CONTEXT -n $NAMESPACE delete pvc --all"
}

case "${1:-}" in
  up) up ;;
  status) status ;;
  down) down ;;
  *) echo "usage: $0 up|status|down"; exit 1 ;;
esac
