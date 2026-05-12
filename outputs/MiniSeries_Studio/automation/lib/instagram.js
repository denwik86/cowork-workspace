// Instagram Reels publisher via Meta Graph API.
// Required: a Business/Creator IG account linked to a Facebook Page,
// and an app with instagram_basic + instagram_content_publish + pages_show_list scopes.
//
// Posting a Reel is a 2-step container flow.

import axios from "axios";

const GRAPH = "https://graph.facebook.com/v20.0";

export async function uploadReel({ videoUrl, caption, coverUrl = null, shareToFeed = true }) {
  const userId = process.env.IG_USER_ID;
  const token = process.env.IG_LONG_LIVED_TOKEN;
  if (!userId || !token) throw new Error("IG_USER_ID / IG_LONG_LIVED_TOKEN not set");

  // 1) Create container
  const create = await axios.post(`${GRAPH}/${userId}/media`, null, {
    params: {
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      cover_url: coverUrl || undefined,
      share_to_feed: shareToFeed,
      access_token: token,
    },
  });
  const containerId = create.data.id;

  // 2) Poll until FINISHED (max 5 min)
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const s = await axios.get(`${GRAPH}/${containerId}`, {
      params: { fields: "status_code", access_token: token },
    });
    if (s.data.status_code === "FINISHED") break;
    if (s.data.status_code === "ERROR") throw new Error("IG container failed");
  }

  // 3) Publish
  const pub = await axios.post(`${GRAPH}/${userId}/media_publish`, null, {
    params: { creation_id: containerId, access_token: token },
  });
  return { id: pub.data.id, url: `https://www.instagram.com/reel/${pub.data.id}/` };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
