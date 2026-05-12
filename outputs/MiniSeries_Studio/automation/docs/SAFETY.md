# Safety, guard rails, and kill switches

## Hard guard rails (enforced in code, not config)
- No call to ElevenLabs, Sora, or paid Anthropic is made without first calling `assertBudgetHeadroom`.
- The week-rolling spend cap is the *floor* — once tripped, the agent refuses to spend, even if `config/guardrails.json` is later edited up.
- Paid boosts above `boostMaxUsd` are rejected at the API edge regardless of approval reply.

## Soft guard rails (config-driven)
- Token cap per week (Sonnet): switches future Showrunner calls to Haiku.
- Sora clips per week: pauses generation; reuses prior B-roll if available.
- Posting cadence: enforced by `config/posting_calendar.json`. Editing the file takes effect next cron tick.

## Kill switch
Create a file `/opt/studio/KILL`. Any module that imports `lib/guard_rails.js` short-circuits with `KILL switch engaged`. Delete the file to resume.

## Content safety
- No celebrity names or quotes (enforced by Showrunner prompt rules).
- Synthetic media flag set true on YouTube upload (`containsSyntheticMedia`).
- AI-content disclosure left ON for TikTok by default; flip in `lib/tiktok.js` if you have a reason.
- No copyrighted music — Epidemic license or silent voiceover only (allowlist enforced in `config/voices.json`).

## Privacy
- The droplet sees only what you upload; no keystroke logging.
- The agent-api stores no PII; logs are pino JSON to stdout, captured by `docker compose logs`.
- The Sora driver stores its session cookie inside the container's `state/` volume — back this up if you want; never share it.
