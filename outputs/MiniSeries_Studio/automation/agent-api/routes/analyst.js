// POST /analyst/refresh
// Pulls metrics for every post in the Posts sheet that was published in the
// last 30 days, appends a Metrics row per post, then computes KPIs and writes
// alerts when a row breaches a threshold.

import express from "express";
import { google } from "googleapis";
import axios from "axios";
import { readRange, appendRow } from "../../lib/sheets.js";
import { caps } from "../../lib/guard_rails.js";

const r = express.Router();

r.post("/refresh", async (_req, res, next) => {
  try {
    const posts = await readRange("Posts");
    const header = posts[0] || [];
    const rows = posts.slice(1);
    const idx = (k) => header.indexOf(k);

    const alerts = [];
    for (const row of rows) {
      const platform = row[idx("platform")];
      const postId = row[idx("post_id")];
      const series = row[idx("series")];
      const episode = row[idx("episode")];
      const publishedAt = Date.parse(row[idx("published_at")] || "");
      if (!Number.isFinite(publishedAt) || Date.now() - publishedAt > 30 * 86_400_000) continue;
      try {
        const m = await pullMetrics({ platform, postId });
        if (!m) continue;
        await appendRow("Metrics", [
          new Date().toISOString(),
          platform, postId, series, episode,
          m.views, m.likes, m.comments, m.shares,
          m.avgWatchPct, m.hookRetention3s, m.followerVelocity || "",
        ]);
        const a = evaluateAlerts({ series, episode, platform, m });
        alerts.push(...a);
      } catch (e) {
        console.error(`metrics failed ${platform}/${postId}`, e.message);
      }
    }
    res.json({ ok: true, posts: rows.length, alerts });
  } catch (e) { next(e); }
});

async function pullMetrics({ platform, postId }) {
  switch (platform) {
    case "youtube":   return ytMetrics(postId);
    case "instagram": return igMetrics(postId);
    case "tiktok":    return tkMetrics(postId);
    default: return null;
  }
}

async function ytMetrics(videoId) {
  const o = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  o.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const yt = google.youtube({ version: "v3", auth: o });
  const v = await yt.videos.list({ part: ["statistics", "contentDetails"], id: [videoId] });
  const s = v.data.items?.[0]?.statistics;
  if (!s) return null;
  return {
    views: Number(s.viewCount || 0),
    likes: Number(s.likeCount || 0),
    comments: Number(s.commentCount || 0),
    shares: 0,
    avgWatchPct: null,        // requires YouTube Analytics API, scoped separately
    hookRetention3s: null,
  };
}

async function igMetrics(mediaId) {
  const token = process.env.IG_LONG_LIVED_TOKEN;
  const url = `https://graph.facebook.com/v20.0/${mediaId}/insights`;
  const r1 = await axios.get(url, {
    params: { metric: "plays,reach,likes,comments,shares,total_interactions", access_token: token },
  }).catch(() => null);
  if (!r1) return null;
  const m = {};
  for (const x of r1.data.data || []) m[x.name] = x.values?.[0]?.value;
  return {
    views: m.plays || 0,
    likes: m.likes || 0,
    comments: m.comments || 0,
    shares: m.shares || 0,
    avgWatchPct: null,
    hookRetention3s: null,
  };
}

async function tkMetrics(_publishId) {
  // Requires Research API tier; for now return null and let the user pull manually.
  return null;
}

function evaluateAlerts({ series, episode, platform, m }) {
  const out = [];
  if (m.views > 50_000) out.push({ kind: "boost_candidate", series, episode, platform, views: m.views });
  if (m.hookRetention3s !== null && m.hookRetention3s < 0.50) {
    out.push({ kind: "hook_weak", series, episode, platform, retention: m.hookRetention3s });
  }
  return out;
}

export default r;
