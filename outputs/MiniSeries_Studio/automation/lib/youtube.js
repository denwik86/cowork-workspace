// YouTube Shorts publisher. Uses the official Data API v3 with a long-lived
// refresh token. Generate the refresh token once with scripts/oauth_youtube.js.

import fs from "node:fs";
import { google } from "googleapis";

let _yt;
function yt() {
  if (_yt) return _yt;
  const o = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );
  o.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  _yt = google.youtube({ version: "v3", auth: o });
  return _yt;
}

export async function uploadShort({ videoPath, title, description, tags = [], madeForKids = false, publishAt = null }) {
  if (!fs.existsSync(videoPath)) throw new Error(`Missing ${videoPath}`);
  const body = {
    snippet: {
      title: clip(title, 100),
      description: clip(description, 4900),
      tags: tags.slice(0, 20),
      categoryId: "24", // Entertainment
    },
    status: {
      privacyStatus: publishAt ? "private" : "public",
      publishAt: publishAt || undefined,
      madeForKids,
      selfDeclaredMadeForKids: madeForKids,
      containsSyntheticMedia: true,
    },
  };
  const res = await yt().videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: body,
      media: { body: fs.createReadStream(videoPath) },
      notifySubscribers: true,
    },
    { maxBodyLength: Infinity }
  );
  return { id: res.data.id, url: `https://youtu.be/${res.data.id}` };
}

function clip(s, n) { return (s || "").slice(0, n); }
