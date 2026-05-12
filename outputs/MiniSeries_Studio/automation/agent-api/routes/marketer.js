// POST /marketer/seed-comments
//   body: { series, episode, script }
// Asks Haiku for 5 seed comments and 1 reply-video idea, returns them.
// Does NOT auto-post — n8n calls the platform comment APIs separately if
// the user has them enabled.

import express from "express";
import { callClaude, loadPrompt, logSpend } from "../../lib/anthropic.js";
import { logSpend as sheetsSpend } from "../../lib/sheets.js";

const r = express.Router();

r.post("/seed-comments", async (req, res, next) => {
  try {
    const { series, episode, script } = req.body;
    const system = await loadPrompt("seed_comments.md");
    const { text, usage, model } = await callClaude({
      model: "haiku",
      system,
      messages: [{ role: "user", content: `Series: ${series}\nEpisode: ${episode}\nScript:\n${script}` }],
      maxTokens: 700,
      temperature: 0.9,
    });
    const cost = logSpend({ workflow: "marketer", episode: `${series}E${episode}`, model, usage });
    await sheetsSpend({ workflow: "marketer", episode: `${series}E${episode}`, vendor: "Anthropic", item: model, usd: cost });
    res.json({ ok: true, raw: text, cost });
  } catch (e) { next(e); }
});

export default r;
