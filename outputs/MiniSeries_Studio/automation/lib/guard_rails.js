// Guard rails — single source of truth for "are we allowed to spend?".
// Every module calls `assert*` before incurring cost. If a rail trips,
// the call throws and n8n routes to the Slack/Telegram alert.

import fs from "node:fs";
import { readRange } from "./sheets.js";

const cfgPath = "/app/config/guardrails.json";
const fileCfg = fs.existsSync(cfgPath)
  ? JSON.parse(fs.readFileSync(cfgPath, "utf8"))
  : {};

const CAPS = {
  weeklyBudgetUsd: num("GUARD_WEEKLY_BUDGET_USD", 40, fileCfg.weeklyBudgetUsd),
  monthlyBudgetUsd: num("GUARD_MONTHLY_BUDGET_USD", 150, fileCfg.monthlyBudgetUsd),
  sonnetWeeklyTokens: num("GUARD_SONNET_WEEKLY_TOKENS", 100_000, fileCfg.sonnetWeeklyTokens),
  elevenWeeklyChars: num("GUARD_ELEVENLABS_WEEKLY_CHARS", 30_000, fileCfg.elevenWeeklyChars),
  soraWeeklyClips: num("GUARD_SORA_WEEKLY_CLIPS", 60, fileCfg.soraWeeklyClips),
  boostMaxUsd: num("GUARD_BOOST_MAX_USD", 50, fileCfg.boostMaxUsd),
};

function num(envKey, def, fileOverride) {
  if (fileOverride !== undefined) return Number(fileOverride);
  const v = process.env[envKey];
  return v ? Number(v) : def;
}

/** Sum spend rows from the Spend sheet over the last N days. */
async function spendWindow(days) {
  const cutoff = Date.now() - days * 86_400_000;
  const rows = await readRange("Spend").catch(() => []);
  let total = 0;
  for (const r of rows) {
    const ts = Date.parse(r[0] || "");
    if (Number.isFinite(ts) && ts >= cutoff) total += Number(r[5] || 0);
  }
  return total;
}

export async function assertBudgetHeadroom({ adding = 0 } = {}) {
  const [wk, mo] = await Promise.all([spendWindow(7), spendWindow(30)]);
  if (wk + adding > CAPS.weeklyBudgetUsd) {
    throw new Error(
      `Weekly cap ${CAPS.weeklyBudgetUsd} would be breached: spent=$${wk.toFixed(
        2
      )} + adding $${adding}`
    );
  }
  if (mo + adding > CAPS.monthlyBudgetUsd) {
    throw new Error(
      `Monthly cap ${CAPS.monthlyBudgetUsd} would be breached: spent=$${mo.toFixed(2)}`
    );
  }
  return { weekUsed: wk, monthUsed: mo, caps: CAPS };
}

export async function assertElevenCharsHeadroom(addingChars) {
  // Best-effort: count rows in Spend tagged vendor=ElevenLabs in last 7 days.
  const rows = await readRange("Spend").catch(() => []);
  const cutoff = Date.now() - 7 * 86_400_000;
  let used = 0;
  for (const r of rows) {
    const ts = Date.parse(r[0] || "");
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    if ((r[3] || "").toLowerCase() === "elevenlabs") {
      const meta = safeJson(r[6]);
      used += Number(meta?.chars || 0);
    }
  }
  if (used + addingChars > CAPS.elevenWeeklyChars) {
    throw new Error(
      `ElevenLabs weekly char cap ${CAPS.elevenWeeklyChars} would be breached`
    );
  }
}

export function assertBoostAmount(usd) {
  if (Number(usd) > CAPS.boostMaxUsd) {
    throw new Error(`Boost amount $${usd} exceeds cap $${CAPS.boostMaxUsd}`);
  }
}

export function caps() {
  return { ...CAPS };
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}
