# 06 — Automation Pipeline

End-to-end blueprint for a self-hosted **n8n** workflow that runs the four-series vertical studio with two human-approval gates only (production budget and paid-marketing spend).

> Estimated implementation effort: 1 weekend for a developer, or 4–6 hours guided in n8n's visual editor. Total cost when running: $6/mo droplet + $20/mo n8n.cloud (or free if self-hosted).

---

## Architecture at a glance

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Daily cron 09:00 ── Trend Scout ──┐                                   │
│                                    │                                   │
│  Weekly cron Mon 09:00 ── Plan ───►├──► Showrunner (Claude API) ──┐    │
│                                    │                              │    │
│  KPI puller 08:00 ──────────────────┘                              │    │
│                                                                    │    │
│   ┌─────────────── Producer (Sora + ElevenLabs + FFmpeg) ◄─────────┘    │
│   │                                                                     │
│   ├─► Publisher (TikTok / YT / IG APIs) at peak slot                    │
│   │                                                                     │
│   └─► Analyst (metrics → Sheets dashboard) every 12 h                   │
│                                                                        │
│  Owner approvals: Slack/Telegram inline buttons                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Module 1 — Trend Scout (n8n workflow `trend-scout`)

**Trigger:** Cron, daily 09:00 local.

**Steps:**
1. HTTP GET TikTok Creative Center trending sounds (drama, suspense, horror buckets) — use the public JSON endpoint exposed by their dashboard or a community library.
2. YouTube Data API → `search.list?part=snippet&type=video&videoDuration=short&order=viewCount&publishedAfter=…&q=mini%20series`.
3. Reddit JSON for `r/shortscarystories/top.json?t=day`, `r/nosleep/top.json?t=day`, `r/twosentencehorror/hot.json`.
4. Pipe all three lists into one Claude Haiku call:
   ```
   Summarize today's top vertical-video drama trends. Return JSON:
   {
     "top_hooks": [10 strings],
     "top_audio_titles": [5 strings],
     "themes": [5 strings],
     "sora_visual_motifs": [5 strings]
   }
   ```
5. Append row to Google Sheets tab `Trends`.

**Cost:** Free APIs + ~$0.005 in Haiku tokens per day.

---

## Module 2 — Showrunner (n8n workflow `showrunner`)

**Trigger:** Cron, Mon 09:00 (weekly plan) + Tue/Thu 09:00 (next-episode generation).

**Steps:**
1. Fetch trend row of the day and the previous week's analytics from the `KPIs` sheet.
2. Fetch series bible cached in Pinecone or a local JSON file. Prompt-cache the bible across calls — paid-cache hits are 90 % cheaper.
3. Single Claude Sonnet 4.6 call per series with:
   - System: full series bible (cached).
   - User: previous episode's analytics + today's trend feed + 'write the next episode in the format defined in /docs/showrunner-format.md'.
4. Parse the response JSON, split into:
   - `script.txt` — voiceover-ready monologue with ElevenLabs SSML hints.
   - `sora_prompts.json` — six prompts.
   - `captions.csv` — on-screen captions with timestamps for FFmpeg.
   - `platform_copy.json` — TikTok / YT / IG captions + hashtags.
5. Write everything to a Google Drive folder named `WEEK-NN/<series>-EP<NN>/`.
6. Slack/Telegram message to owner: 'Week N plan ready, total predicted cost = $X.XX. Approve?'

**Cost per episode:** ~$0.03 of Sonnet tokens (with cache hits).

---

## Module 3 — Producer (n8n + bash on the droplet)

**Trigger:** Webhook fired by Showrunner after owner approves the week.

**Steps (per episode):**
1. Loop over `sora_prompts.json`. For each, either:
   - Send the prompt to Sora via your Sora session (use a headless-browser worker since Sora has no public API as of May 2026), OR
   - Open a queue and process clips manually if Sora rate-limits.
2. Download the six MP4 clips to `media/shots/`.
3. ElevenLabs API call: POST `/v1/text-to-speech/{voice_id}/stream` for the full episode VO; voice settings from `voice_config.json`. Save to `media/voice/`.
4. Pick the matching music bed from the Epidemic library based on `series` and `tone`. Save to `media/music/`.
5. Run the FFmpeg recipe (from the Week 1 Scripts doc) headlessly:
   ```
   bash /opt/studio/build_episode.sh <series> <ep>
   ```
   This script:
   - concats clips,
   - mixes voice + music + a -22 dB trend-sound layer,
   - burns captions from `captions.csv`,
   - renders 1080×1920, 30 fps, H.264, target 5 Mbps,
   - outputs `out/<series>_EP<NN>.mp4` and `out/thumb_<series>_EP<NN>.jpg`.
6. Notify Publisher webhook with the file path.

**Cost per episode:** $0 in API tokens (Sora is in your subscription). ElevenLabs ~$0.08.

**Note on Sora automation:** Sora's web app does not expose a public API as of May 2026. Use Playwright/Puppeteer headless to drive the session, or queue prompts for manual generation in a single 30-minute batch every Sunday. Either path is documented in the runbook.

---

## Module 4 — Publisher

**Trigger:** Cron jobs aligned to the posting calendar in `05_Marketing_Playbook.docx` §3.

**APIs used:**

| Platform | API | Status | Notes |
| --- | --- | --- | --- |
| TikTok | Content Posting API | **Apply Day 1** | 1–3 week approval. Until approved, fall back to a mobile auto-uploader (e.g., Postiz, Metricool, Buffer). |
| YouTube | Data API v3 — `videos.insert` with `shorts` flag | Self-serve, OAuth | Always set `madeForKids=false` and AI-content flag. |
| Instagram | Graph API — Reels container + publish | OAuth, requires Business/Creator account | Pre-upload to a CDN and pass `video_url`. |

**Steps per scheduled post:**
1. Read post metadata from `WEEK-NN/<series>-EP<NN>/platform_copy.json`.
2. Upload to the matching platform with caption, hashtags, AI-content disclosure flag ON, scheduled at the peak slot.
3. Log the post ID into the `Posts` Sheet tab.
4. Schedule the Seed-Comments sub-workflow to fire at T+5 min (Module 6).

---

## Module 5 — Analyst (`analyst`)

**Trigger:** Cron every 12 h.

**Steps:**
1. Pull metrics from TikTok / YT / IG using each platform's analytics endpoint (or scrape the Studio pages via headless if no API access).
2. Append a row per post per snapshot to `Metrics` sheet.
3. Compute KPIs: Hook Retention 3 s, Avg Watch-Through, Follower Velocity, Cost / 1k Views (joining with `04_Production_Budget.xlsx`).
4. If any KPI breaches a threshold, push a Slack message:
   - Hook retention < 50 % → 'S?E? needs hook rework'.
   - Episode > 50k views → 'BOOST CANDIDATE — owner approve $30?'
5. Generate Daily Update markdown (see `07_Daily_Operations.docx`) and send to owner at 08:00 each day.

---

## Module 6 — Marketer (`marketer`)

**Trigger:** Webhook T+5 min after every post.

**Steps:**
1. From a pool of 12 pre-warmed secondary accounts (per platform), draft 5 seed comments using Claude Haiku conditioned on the episode script and a 'do not generic-praise' rule.
2. Auto-post the seeds from the secondary accounts via the platform APIs (TikTok comment API once approved; mobile-automation fallback meanwhile).
3. At T+6 h trigger the Reply-Video sub-workflow if any real comment crosses 5 likes — Showrunner writes a 30-s reply script, Producer renders, Publisher posts as a 'reply Short'.

---

## Module 7 — Approval Gate (Slack/Telegram bot)

**Two gates only:**

1. **Weekly production budget** — Monday 09:00. The bot posts:
   ```
   Week 23 plan ready:
   • 8 episodes, predicted cost = $11.40
   • Largest line: ElevenLabs $1.60
   [Approve] [Edit] [Cap @ $X]
   ```
   Default behaviour if no response in 24 h: auto-approve up to the weekly cap of $40 (configurable).

2. **Paid-marketing push** — only when Analyst flags a boost candidate. The bot posts:
   ```
   S2E04 has 78 % WT after 6 h, 47k views.
   Recommend boost: $30 TikTok Promote, lookalike of top engagers.
   [Approve] [Cap @ $X] [Skip]
   ```
   Default if no response in 12 h: skip.

---

## Module 8 — KPI dashboard

A single Google Sheet (or a Looker Studio dashboard reading from it) with tabs:

- `Trends` — daily trend feed
- `Plans` — weekly plans approved
- `Posts` — every post with platform IDs and caption
- `Metrics` — twice-daily metric snapshots
- `KPIs` — computed Hook Retention, WT, Cost/1k Views, Follower Velocity
- `Reviews` — Day-30 / Day-60 / Day-90 decision memos

The 04_Production_Budget.xlsx links to this dashboard for the cost lines.

---

## API checklist (apply Day 1)

- [ ] TikTok for Developers — Content Posting API + Login Kit. **Apply 1 May.**
- [ ] YouTube Data API v3 — create OAuth 2.0 client.
- [ ] Meta for Developers — App with `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management` permissions. Requires App Review.
- [ ] ElevenLabs API key, Flash v2.5 model access.
- [ ] Anthropic API key (or Claude.ai team plan for Claude Code).
- [ ] Replicate API key (Flux Schnell) — optional.
- [ ] Epidemic Sound API or Personal license.
- [ ] Google Sheets API service account.
- [ ] Slack/Telegram bot token for approvals.
- [ ] DigitalOcean droplet (2 GB, $12/mo or $6 nano) — Ubuntu 22.04 with Node, FFmpeg, Python, Playwright.
- [ ] n8n.cloud account, or self-host on the droplet (`docker run n8nio/n8n`).

---

## Build sequence (recommended)

1. **Day 1**: Get all API keys; spin up droplet; install n8n self-hosted.
2. **Day 2**: Module 5 (Analyst) — read-only is safe first step.
3. **Day 3**: Modules 1, 2 (Trend Scout, Showrunner) — output Markdown to Drive, no posting yet.
4. **Day 4**: Module 3 (Producer) — render the first 8 Week-1 episodes that are already scripted in `02_Week1_Scripts_and_SoraPrompts.docx`.
5. **Day 5**: Module 4 (Publisher) — start with YouTube Shorts (easiest API), then add IG, then TikTok once approved.
6. **Day 6**: Module 6 (Marketer) + Module 7 (Approval bot).
7. **Day 7**: Owner trial run — full week in production.

---

## Token-cost guard rails (hard limits in the orchestrator)

| Guard rail | Default | Action if breached |
| --- | --- | --- |
| Claude Sonnet tokens / week | 100 k | Switch all Showrunner calls to Haiku for the rest of the week |
| ElevenLabs chars / week | 30 k | Reduce voiceover takes per episode to 1 |
| Sora clips generated / week | 60 | Pause generation; reuse B-roll |
| Total weekly $ | $40 | Block new generation; ping owner |
| Total monthly $ | $150 | Block new boosts; ping owner |

Every module logs its spend to the `Metrics` sheet, and the orchestrator reads the running total at the start of each run before deciding to proceed.
