# API Keys — what to get, in what order

> Order is chosen so each step unblocks the next without paying for things you can't yet use.

| # | Service | Time to get | Scopes / settings | Free tier? |
|---|---------|-------------|-------------------|------------|
| 1 | **Anthropic** | 5 min | Key with `messages:write`. Set Sonnet + Haiku models. | $5 free credit |
| 2 | **ElevenLabs** | 5 min | API key. Pick Flash v2.5. Reserve voice IDs for Maya / Future-Maya / Ella / Kiri / Narrator. | 10 min/mo |
| 3 | **Google Cloud / Sheets** | 30 min | Enable Sheets API → create service account → JSON key. Share the KPI sheet with the service account email. | Free |
| 4 | **YouTube Data API v3** | 30 min | OAuth 2.0 client (Desktop type). Use `scripts/oauth_youtube.js` once to mint a refresh token. Quota = 10k/day (plenty). | Free |
| 5 | **Meta / Instagram Graph** | 1 day | Create a Meta app, add Instagram Graph product. Link IG Business account to a FB Page. Get a 60-day long-lived token. Scopes: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`. | Free, needs App Review for production |
| 6 | **TikTok Content Posting API** | 1–3 weeks | Apply at developers.tiktok.com. Scopes: `video.upload`, `video.publish`. Until approved, leave `TIKTOK_FALLBACK=manual`. | Free |
| 7 | **Slack** | 15 min | Create a Slack app, install in your workspace. Scopes: `chat:write`, `commands`, `app_mentions:read`. Grab bot token + signing secret. | Free |
| 8 | **Telegram (fallback)** | 5 min | Talk to @BotFather. Grab token + your numeric chat ID. | Free |
| 9 | **DigitalOcean** | 10 min | Create droplet. SSH key. | $5/mo+ |
| 10 | **Epidemic Sound** | optional | Personal license; export library to `/opt/studio/media/music_library`. | Paid |
| 11 | **Replicate** (optional Flux Schnell for thumbnails) | 5 min | API token. | Pay per use |

## Where to store keys
- All in `/opt/studio/.env` (chmod 600).
- Google service account JSON at `/opt/studio/secrets/gsheets.json` (chmod 600).
- NEVER commit these to git. The provided `.gitignore` already excludes them.

## Rotating
- Anthropic: rotate every 90 days via console.
- ElevenLabs: rotate any time, restart the agent-api container.
- IG long-lived token: refresh every 60 days (cron at Day 50 if you want zero downtime).
- YouTube refresh token: only invalidates when you change your Google password.

## What happens if a key is missing
Each route returns a clear `400`/`500` describing the missing variable; the n8n workflow surfaces it to Slack as an error. Nothing fails silently.
