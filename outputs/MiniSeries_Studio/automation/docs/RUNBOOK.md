# RUNBOOK — Deploying the Vertical Studio Pipeline

This is the literal click-by-click deploy guide.

## Prereqs
- A DigitalOcean account (or any Ubuntu 22.04 VM with 2 GB RAM, 50 GB disk)
- A domain (optional) pointed to the droplet (for n8n HTTPS)
- API keys from `docs/API_KEYS.md`

## Step 1 — Provision the droplet
1. Create an Ubuntu 22.04 droplet (Basic, $12/mo, 2 GB RAM, NYC or AMS region).
2. SSH in as root: `ssh root@<ip>`.
3. Clone or rsync this `automation/` directory into `/opt/studio`:
   ```
   rsync -av automation/ root@<ip>:/opt/studio/
   ```
4. Run the setup script:
   ```
   cd /opt/studio && bash scripts/setup_droplet.sh
   ```

## Step 2 — Configure environment
1. Copy `.env.example` to `.env` and fill in every value you have. Leave TikTok blank for now — `TIKTOK_FALLBACK=manual` makes it skip cleanly.
2. Generate strong secrets for `N8N_ENCRYPTION_KEY`, `N8N_BASIC_AUTH_PASSWORD`, and `AGENT_API_SHARED_SECRET`:
   ```
   openssl rand -hex 32
   ```
3. Put your Google service account JSON at `/opt/studio/secrets/gsheets.json` (chmod 600).
4. If using Slack, install the studio's Slack app and grab the bot token + signing secret.

## Step 3 — Bring up the stack
```
cd /opt/studio
docker compose up -d --build
docker compose ps        # all healthy?
docker compose logs -f agent-api
```
Then open `http://<droplet-ip>:5678` and log in with the basic-auth creds.

## Step 4 — Import the workflows
In the n8n UI:
1. Click **Import from File** (top-right menu).
2. Import each of the eight JSON files from `/opt/studio/n8n-workflows/`.
3. In each workflow, set the credentials (Slack, Google Sheets) once. The HTTP nodes use the `AGENT_API_SHARED_SECRET` env var so they need no extra config.
4. Toggle each workflow to **Active**.

## Step 5 — Smoke test
```
bash /opt/studio/scripts/smoke_test.sh
```
Should print `Smoke test PASSED` and a guardrails JSON.

## Step 6 — Drive a first episode end-to-end (manual fan-out)
1. In n8n, open `02 — Showrunner`. Click **Execute Workflow** with body `{series:"S1", weekNumber:20, episodeNumber:1}`.
2. The Sora worker picks up the 6 prompt jobs from `/app/media/queue/sora` and downloads MP4s into `/app/media/shots`.
3. POST to `Webhook /producer-build` with `{series:"S1", episodeNumber:1}` to assemble the episode (`out/S1_EP01.mp4`).
4. POST to `Webhook /publisher` or wait for the cron slot — the file uploads to YT Shorts first.

## Step 7 — Daily routine
- Twice per day, Analyst pulls metrics. If it flags a boost candidate, the bot asks; you reply `approve`, `cap N`, or `skip`.
- Mondays at 09:00, the budget gate asks you to greenlight the week.

## Disaster recovery
- Touch the kill switch: `touch /opt/studio/KILL`. The agent refuses to spend until you remove it.
- Restore from backup: copy `/opt/studio/_data/backups/<date>.json` into Sheets manually, or run `scripts/restore_sheets.sh` (TBD).
