# Vertical Studio — Automation Pipeline (Implementation)

This folder is the runnable implementation of `06_Automation_Pipeline.md`. It contains:

- A **docker-compose** stack (n8n + PostgreSQL + a small Node API for the agents)
- **8 importable n8n workflow JSONs** (one per module from the plan)
- **Node.js libraries** that wrap each external API (Anthropic, ElevenLabs, Google Sheets, TikTok, YouTube, Instagram, Sora via Playwright)
- **Bash scripts** for droplet setup, FFmpeg episode assembly, and the Sora queue worker
- **Prompts and config** so the Showrunner / Trend Scout / Marketer agents are 100% reproducible

> The pipeline runs on a single $12/mo DigitalOcean droplet, or anywhere you can run Docker + Node + FFmpeg. n8n.cloud also works — just import the JSONs.

---

## 1. Read this before doing anything

**Never paste API keys into the chat.** All secrets go into a single `.env` file on the droplet (or n8n.cloud credential vault). The repo has `.env.example` with every variable enumerated. The Claude session helping you deploy this will *never* see the live secrets.

The pipeline has two human approval gates only:

1. **Weekly production budget** — Mondays 09:00 (default cap: $40/wk)
2. **Per-push paid marketing** — when Analyst flags a boost candidate (default cap: $50/push)

Everything else is autonomous. The orchestrator will refuse to spend if it crosses guard rails in `lib/guard_rails.js`.

---

## 2. Bring-up sequence (90 minutes from zero to first episode)

```
Day 1  ── 1. Provision droplet         scripts/setup_droplet.sh
       ── 2. Drop .env into /opt/studio
       ── 3. docker compose up -d      brings up n8n + postgres + agent-api
       ── 4. Import the 8 workflows    n8n-workflows/*.json
       ── 5. Run the smoke test        scripts/smoke_test.sh
Day 2  ── 6. Hook up Google Sheets credential → run Analyst once
       ── 7. Run Showrunner manually for S1E01 (already scripted)
Day 3  ── 8. Render with build_episode.sh, upload to YT Shorts only
Day 4  ── 9. Add IG; apply for TikTok Content Posting API
Day 5+ ── 10. Enable full cron schedule
```

A more detailed runbook lives in `docs/RUNBOOK.md`.

---

## 3. Files at a glance

```
automation/
├── README.md                       ← this file
├── .env.example                    ← every secret enumerated, none filled
├── docker-compose.yml              ← n8n + postgres + agent-api stack
├── package.json                    ← Node deps for the agent-api service
├── agent-api/                      ← thin HTTP service the n8n workflows call
│   ├── server.js
│   └── routes/
│       ├── showrunner.js
│       ├── producer.js
│       ├── analyst.js
│       ├── marketer.js
│       └── trend-scout.js
├── lib/                            ← reusable clients (no business logic)
│   ├── anthropic.js
│   ├── elevenlabs.js
│   ├── sheets.js
│   ├── sora_playwright.js
│   ├── tiktok.js
│   ├── youtube.js
│   ├── instagram.js
│   ├── guard_rails.js
│   └── logger.js
├── n8n-workflows/                  ← importable JSON
│   ├── 01_trend_scout.json
│   ├── 02_showrunner.json
│   ├── 03_producer.json
│   ├── 04_publisher.json
│   ├── 05_analyst.json
│   ├── 06_marketer.json
│   ├── 07_approval_gate.json
│   └── 08_guardrail_check.json
├── scripts/
│   ├── setup_droplet.sh            ← installs Docker, Node, FFmpeg, fonts
│   ├── build_episode.sh            ← concat clips + mix audio + burn captions
│   ├── sora_queue.sh               ← daemon that consumes prompts/ and runs Playwright
│   ├── smoke_test.sh               ← end-to-end dry-run with mock APIs
│   └── backup_sheets.sh            ← nightly snapshot of the KPI sheet
├── prompts/
│   ├── showrunner_system.md        ← cached system prompt with full series bible
│   ├── trend_scout.md
│   ├── seed_comments.md
│   └── reply_video.md
├── config/
│   ├── voices.json                 ← ElevenLabs voice IDs + settings per character
│   ├── series_meta.json            ← per-series complexity multipliers & calendar
│   ├── posting_calendar.json       ← day × platform × time slots
│   ├── hashtags.json
│   └── guardrails.json             ← spend caps and policy thresholds
├── bots/
│   └── approval_bot.js             ← Slack + Telegram inline-button bot
└── docs/
    ├── RUNBOOK.md                  ← step-by-step deploy guide
    ├── API_KEYS.md                 ← how to get each key + scopes needed
    ├── SAFETY.md                   ← guard rails + kill switches
    └── TROUBLESHOOTING.md
```

---

## 4. What this code does NOT do

- **It does not bypass any platform Terms of Service.** Auto-posting uses each platform's official Content/Publishing API where available. The mobile-automation fallbacks (Postiz, Metricool, etc.) are listed but optional; you decide what risk you accept.
- **It does not click "buy ads".** The Marketer module only drafts boost requests and seeds organic comments. All paid spend requires owner approval through the bot.
- **It does not auto-generate Sora clips you haven't approved.** Sora prompts are queued; the queue worker only runs prompts that came out of the Showrunner agent and were tagged `approved=true` by the weekly Monday gate.

---

## 5. Cost envelope (matches `04_Production_Budget.xlsx`)

| Item | Per episode | Per week (8 eps) |
| --- | --- | --- |
| Anthropic (Sonnet + Haiku, cached) | $0.05 | $0.40 |
| ElevenLabs Flash v2.5 | $0.08 | $0.64 |
| Sora | $0 (subscription) | $0 |
| Music (Epidemic personal) | $0 | $0 |
| Droplet + n8n | — | $4 (amortised) |
| **Total tokens** | **~$0.13** | **~$5.04** |

The hard ceiling enforced in `lib/guard_rails.js` is **$40/week** total spend across all four series.

---

## 6. Getting started right now

1. Open `docs/API_KEYS.md` and start registering for the keys you don't have yet. The order that unblocks the most work first is: **Anthropic → ElevenLabs → Google Sheets → YouTube → Instagram → TikTok**. (TikTok is last because their Content Posting API takes 1–3 weeks for approval.)
2. While waiting on TikTok, you can still produce and post to YouTube Shorts and Instagram Reels — that's already 2/3 of the platform footprint.
3. Provision the droplet and run `scripts/setup_droplet.sh` — it's idempotent.

When you're ready, drop the filled `.env` into `/opt/studio/.env` and run:

```
cd /opt/studio
docker compose up -d
docker compose logs -f agent-api    # tail the logs
```

The n8n UI is at `http://<droplet-ip>:5678` after `docker compose up`. Import the 8 workflow JSONs from `n8n-workflows/` and you're live.
