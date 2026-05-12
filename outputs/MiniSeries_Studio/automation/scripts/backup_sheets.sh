#!/usr/bin/env bash
# Nightly snapshot of the KPI sheet → /opt/studio/_data/backups/YYYY-MM-DD.json
set -euo pipefail
SECRET="${AGENT_API_SHARED_SECRET:?}"
HOST="${HOST:-http://localhost:4000}"
DEST="${STUDIO_ROOT:-/opt/studio}/_data/backups"
mkdir -p "${DEST}"
DATE=$(date -u +%F)
curl -sf -X POST "${HOST}/analyst/refresh" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" -d '{}' \
  > "${DEST}/${DATE}.json"
echo "wrote ${DEST}/${DATE}.json"
