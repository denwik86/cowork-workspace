// POST /publisher/post
//   body: { platform, series, episode, videoPath, title, description, hashtags, publishAt }
// Routes to YT, IG, or TT publisher. Logs to the Posts sheet.

import express from "express";
import { uploadShort } from "../../lib/youtube.js";
import { uploadReel } from "../../lib/instagram.js";
import { uploadVideo } from "../../lib/tiktok.js";
import { appendRow } from "../../lib/sheets.js";

const r = express.Router();

r.post("/post", async (req, res, next) => {
  try {
    const { platform, series, episode, videoPath, title, description, hashtags = [], publishAt = null, videoUrl = null } = req.body;
    let result;
    switch (platform) {
      case "youtube":
        result = await uploadShort({ videoPath, title, description, tags: hashtags, publishAt });
        break;
      case "instagram":
        if (!videoUrl) throw new Error("Instagram needs a public videoUrl");
        result = await uploadReel({ videoUrl, caption: `${description}\n\n${hashtags.map(h=>`#${h}`).join(" ")}` });
        break;
      case "tiktok":
        result = await uploadVideo({ videoPath, title: description, hashtags });
        break;
      default:
        throw new Error(`Unknown platform ${platform}`);
    }
    await appendRow("Posts", [
      "id", "platform", "post_id", "series", "episode", "title", "url", "published_at",
    ].length === 8 ? "" : "",  // header-fix no-op
    );
    // Append the actual row (header is created on first run)
    await appendRow("Posts", [
      Date.now().toString(),
      platform,
      result.id || "",
      series,
      episode,
      title,
      result.url || "",
      new Date().toISOString(),
    ]);
    res.json({ ok: true, result });
  } catch (e) { next(e); }
});

export default r;
