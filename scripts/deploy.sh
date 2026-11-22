#!/usr/bin/env bash
# Compila il client e pubblica server + client sul server di produzione.
# Uso: DEPLOY_HOST=host DEPLOY_USER=utente scripts/deploy.sh

set -euo pipefail

: "${DEPLOY_HOST:?Imposta DEPLOY_HOST}"
: "${DEPLOY_USER:?Imposta DEPLOY_USER}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/${DEPLOY_USER}/trello-clone}"

cd "$(dirname "$0")/.."

echo "Compilo il client..."
npm ci
npm run build

echo "Preparo il pacchetto..."
tar -czf deploy.tar.gz \
    package.json package-lock.json ecosystem.config.js \
    app/server/package.json app/server/src app/server/.env.example \
    app/client/package.json app/client/dist
trap 'rm -f deploy.tar.gz' EXIT

echo "Invio a ${DEPLOY_USER}@${DEPLOY_HOST}..."
scp deploy.tar.gz "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/trello-clone.tar.gz"

ssh "${DEPLOY_USER}@${DEPLOY_HOST}" DEPLOY_PATH="${DEPLOY_PATH}" bash -s << 'ENDSSH'
set -euo pipefail
mkdir -p "$DEPLOY_PATH"
cd "$DEPLOY_PATH"
tar -xzf /tmp/trello-clone.tar.gz
rm /tmp/trello-clone.tar.gz

npm ci --omit=dev -w app/server --include-workspace-root=false

if [ ! -f app/server/.env ]; then
    echo "Manca app/server/.env: copialo da app/server/.env.example e compilalo, poi rilancia."
    exit 1
fi

pm2 startOrReload ecosystem.config.js --env production
pm2 save
ENDSSH

echo "Deploy completato: http://${DEPLOY_HOST}"
