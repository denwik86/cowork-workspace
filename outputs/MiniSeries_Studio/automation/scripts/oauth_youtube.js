// One-shot helper to generate a YouTube refresh token.
// Run on your local machine (NOT in Docker): `node scripts/oauth_youtube.js`.
// Open the printed URL, paste the redirect code back, get a refresh token.

import "dotenv/config";
import readline from "node:readline";
import { google } from "googleapis";

const o = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob" // out-of-band — paste code back in terminal
);

const url = o.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
  ],
});
console.log("\nOpen this URL, then paste the code below:\n");
console.log(url, "\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("code: ", async (code) => {
  const { tokens } = await o.getToken(code.trim());
  console.log("\nrefresh_token =", tokens.refresh_token);
  rl.close();
});
