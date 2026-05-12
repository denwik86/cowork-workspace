# Troubleshooting

### `docker compose up` fails with "permission denied"
Run with sudo, or add your user to the `docker` group: `usermod -aG docker $USER` and log out/in.

### n8n web UI loads but workflows fail with "401 unauthorized"
The HTTP nodes are sending the wrong Bearer token. Check that `AGENT_API_SHARED_SECRET` is set the SAME value in `.env` AND in the n8n environment (the docker-compose file passes it through automatically — if you edited that, double-check).

### `agent-api` container restart loops
`docker compose logs agent-api` will show the error. The most common is a missing env var or a malformed Google service-account JSON path. Fix `.env`, then `docker compose up -d` (no need to rebuild).

### Sora worker keeps timing out
Two causes:
1. Sora's web UI changed selectors. Open the file `lib/sora_playwright.js`, look at the `getByRole(...)` calls, update to match the current UI, restart `sora-worker`.
2. Rate limited. Lower `SORA_DAILY_CLIP_BUDGET` to 8 and retry. Heavy users report Sora rate-limiting around 15–20 clips/day.

### YouTube upload returns 403
Quota exceeded (rare — needs 100+ uploads in a day) OR the channel isn't verified for Shorts. Verify the channel in YouTube Studio.

### Instagram container stays in `IN_PROGRESS` forever
IG insists the video be on a public HTTPS URL. The `videoUrl` field must NOT point to localhost or a presigned S3 link with auth tokens — Meta's fetcher can't read it. Use a CDN bucket with a public bucket policy.

### ElevenLabs `429 Too Many Requests`
Free tier is 10 min/month. Upgrade or batch your daily output. The orchestrator already does sequential calls, so it's not a concurrency issue.

### Spend cap tripped unexpectedly
Open the Spend tab in your Google Sheet. Each row is a single charge. If you see a runaway loop (lots of identical rows from one workflow), turn that workflow OFF in n8n and inspect.

### Approval bot says "No pending approval right now"
The bot only matches the LATEST `.pending.json` in `/app/state/approvals`. If you let one expire, it was archived. Trigger the gate workflow manually from n8n to recreate it.
