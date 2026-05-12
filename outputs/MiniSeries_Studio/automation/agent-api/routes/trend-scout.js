// POST /trend-scout/run
// Pulls Reddit + YouTube trend feeds, asks Haiku to summarise, writes a row
// to the Trends sheet. Returns the parsed JSON.

import express from "express";
import axios from "axios";
import { google } from "googleapis";
import { callClaude, loadPrompt, logSpend } from "../../lib/anthropic.js";
import { logTrend, logSpend as sheetsSpend } from "../../lib/sheets.js";

const r = express.Router();

r.post("/run", async (_req, res, next) => {
  try {
    const [reddit, youtube] = await Promise.all([fetchReddit(), fetchYouTube()]);
    const system = await loadPrompt("trend_scout.md");
    const userMsg = `Reddit JSON:\n${JSON.stringify(reddit).slice(0, 8000)}\n\nYouTube JSON:\n${JSON.stringify(youtube).slice(0, 8000)}`;
    const { text, usage, model } = await callClaude({
      model: "haiku",
      system,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 1500,
      temperature: 0.4,
    });
    const cost = logSpend({ workflow: "trend-scout", episode: "", model, usage });
    await sheetsSpend({ workflow: "trend-scout", vendor: "Anthropic", item: model, usd: cost, meta: { usage } });

    const parsed = safeJson(text) || { top_hooks: [], top_audio_titles: [], themes: [], sora_visual_motifs: [] };
    await logTrend([new Date().toISOString(), JSON.stringify(parsed)]);
    res.json({ ok: true, trends: parsed, cost });
  } catch (e) { next(e); }
});

async function fetchReddit() {
  const subs = ["shortscarystories", "nosleep", "twosentencehorror"];
  const out = {};
  for (const s of subs) {
    try {
      const r = await axios.get(`https://www.reddit.com/r/${s}/top.json?t=day&limit=20`, {
        headers: { "User-Agent": "vertical-studio/1.0" },
      });
      out[s] = (r.data.data.children || []).map((c) => ({
        title: c.data.title,
        score: c.data.score,
        num_comments: c.data.num_comments,
      }));
    } catch { out[s] = []; }
  }
  return out;
}

async function fetchYouTube() {
  try {
    const o = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
    o.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
    const yt = google.youtube({ version: "v3", auth: o });
    const q = await yt.search.list({
      part: ["snippet"], type: ["video"], videoDuration: "short",
      order: "viewCount", q: "mini series", maxResults: 25,
      publishedAfter: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    });
    return (q.data.items || []).map((i) => ({ title: i.snippet.title, channel: i.snippet.channelTitle }));
  } catch { return []; }
}

function safeJson(t) {
  const c = t.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  try { return JSON.parse(c); } catch { return null; }
}

export default r;
