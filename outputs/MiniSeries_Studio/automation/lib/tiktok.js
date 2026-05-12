// TikTok Content Posting API publisher. Until the app is approved (1-3 weeks),
// `uploadVideo` will return { fallback: true } so the caller can route to manual.
//
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started

import axios from "axios";
import fs from "node:fs";

const API = "https://open.tiktokapis.com/v2";

export async function uploadVideo({ videoPath, title, hashtags = [], disableComment = false }) {
  if (process.env.TIKTOK_FALLBACK === "manual" || !process.env.TIKTOK_ACCESS_TOKEN) {
    return { fallback: true, reason: "TikTok API not yet approved" };
  }
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  const stat = fs.statSync(videoPath);

  // 1) Init upload
  const init = await axios.post(
    `${API}/post/publish/video/init/`,
    {
      post_info: {
        title: `${title} ${hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`.slice(0, 2200),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_comment: disableComment,
        disable_duet: false,
        disable_stitch: false,
        brand_content_toggle: false,
        brand_organic_toggle: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: stat.size,
        chunk_size: stat.size,
        total_chunk_count: 1,
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { upload_url, publish_id } = init.data.data;

  // 2) Upload bytes
  await axios.put(upload_url, fs.createReadStream(videoPath), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": stat.size,
      "Content-Range": `bytes 0-${stat.size - 1}/${stat.size}`,
    },
    maxBodyLength: Infinity,
  });

  return { id: publish_id, fallback: false };
}

export async function seedComment({ videoId, text }) {
  if (process.env.TIKTOK_FALLBACK === "manual") {
    return { fallback: true };
  }
  // Note: comment posting requires user.info.basic + research.video.comment scopes
  // and is only granted to a subset of partners. Provided as a stub.
  return { fallback: true, reason: "comment scope not granted" };
}
