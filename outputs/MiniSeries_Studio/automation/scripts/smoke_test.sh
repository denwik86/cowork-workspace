#!/usr/bin/env bash
# Smoke test the running stack.
set -euo pipefail
HOST="${HOST:-http://localhost:4000}"
SECRET="${AGENT_API_SHARED_SECRET:?set AGENT_API_SHARED_SECRET}"

curl -sf "${HOST}/health" | jq .
echo "---"
curl -sf -X POST "${HOST}/guardrails/check" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" -d '{}' | jq .
echo "---"
echo "Smoke test PASSED"
