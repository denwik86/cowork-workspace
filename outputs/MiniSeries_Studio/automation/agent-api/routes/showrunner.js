// POST /showrunner/episode
//   body: { series: "S1"|"S2"|"S3"|"S4", weekNumber, episodeNumber, trends, lastAnalytics }
// Returns the parsed JSON output (script + sora prompts + captions + platform copy)
// and writes copies to /app/media/episodes/<series>_EP<NN>/.

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { callClaude, loadPrompt, logSpend } from "../../lib/anthropic.js";
import { logSpend as sheetsSpend } from "../../lib/sheets.js";
import { assertBudgetHeadroom } from "../../lib/guard_rails.js";

const r = express.Router();

r.post("/episode", async (req, res, next) => {
  try {
    const { series, weekNumber, episodeNumber, trends = {}, lastAnalytics = {} } = req.body;
    if (!series || !episodeNumber) {
      return res.status(400).json({ error: "series and episodeNumber required" });
    }
    await assertBudgetHeadroom({ adding: 0.10 });

    const bible = await loadPrompt(`series_bibles/${series}.md`).catch(() =>
      loadPrompt("showrunner_system.md")
    );
    const system = await loadPrompt("showrunner_system.md");
    const userMsg = renderUserMessage({ series, weekNumber, episodeNumber, trends, lastAnalytics });

    const { text, usage, model } = await callClaude({
      model: "sonnet",
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
        { type: "text", text: bible, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 2500,
      temperature: 0.8,
    });

    const cost = logSpend({ workflow: "showrunner", episode: `${series}E${episodeNumber}`, model, usage });
    await sheetsSpend({
      workflow: "showrunner",
      episode: `${series}E${episodeNumber}`,
      vendor: "Anthropic",
      item: model,
      usd: cost,
      meta: { usage },
    }).catch(() => {});

    const episode = safeJson(text);
    if (!episode) return res.status(502).json({ error: "Claude did not return JSON", raw: text });

    const outDir = `/app/media/episodes/${series}_EP${String(episodeNumber).padStart(2, "0")}`;
    await fs.mkdir(outDir, { recursive: true });
    await writeAll(outDir, episode);
    await queueSoraJobs({ series, episodeNumber, prompts: episode.sora_prompts || [] });

    res.json({ ok: true, outDir, episode, cost });
  } catch (e) { next(e); }
});

function renderUserMessage({ series, weekNumber, episodeNumber, trends, lastAnalytics }) {
  return [
    `Series: ${series}`,
    `Week: ${weekNumber}, Episode: ${episodeNumber}`,
    `Today's trends JSON: ${JSON.stringify(trends)}`,
    `Last 7 days of analytics: ${JSON.stringify(lastAnalytics)}`,
    "",
    "Write the next episode strictly as JSON with the schema described in the system prompt.",
  ].join("\n");
}

function safeJson(text) {
  // Strip markdown fences if present.
  const cleaned = text.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
}

async function writeAll(dir, ep) {
  await fs.writeFile(path.join(dir, "script.txt"), ep.script || "");
  await fs.writeFile(path.join(dir, "sora_prompts.json"), JSON.stringify(ep.sora_prompts || [], null, 2));
  await fs.writeFile(path.join(dir, "captions.csv"), (ep.captions || []).map((c) =>
    `${c.start},${c.end},"${(c.text || "").replace(/"/g, '""')}"`
  ).join("\n"));
  await fs.writeFile(path.join(dir, "platform_copy.json"), JSON.stringify(ep.platform_copy || {}, null, 2));
  await fs.writeFile(path.join(dir, "voice_lines.json"), JSON.stringify(ep.voice_lines || [], null, 2));
}

async function queueSoraJobs({ series, episodeNumber, prompts }) {
  const queue = "/app/media/queue/sora";
  await fs.mkdir(queue, { recursive: true });
  for (let i = 0; i < prompts.length; i++) {
    const id = `${series}_E${String(episodeNumber).padStart(2, "0")}_S${i + 1}_${Date.now()}`;
    const job = {
      id,
      series,
      episode: episodeNumber,
      shot: i + 1,
      prompt: prompts[i].prompt || prompts[i],
      aspect: "9:16",
      duration: prompts[i].duration || 5,
    };
    await fs.writeFile(path.join(queue, `${id}.json`), JSON.stringify(job));
  }
}

export default r;
