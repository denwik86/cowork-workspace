// Approval bot — listens for owner replies to the two approval-gate questions:
//   1) Weekly production plan  (Mon 09:00)
//   2) Per-push paid boost     (when Analyst flags a candidate)
//
// Slack is the primary channel; Telegram is a parallel listener (optional).
// State (pending approvals + expiry) lives on disk under /app/state/approvals.

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { App as SlackApp, ExpressReceiver } from "@slack/bolt";
import TelegramBot from "node-telegram-bot-api";

const STATE_DIR = "/app/state/approvals";
await fs.mkdir(STATE_DIR, { recursive: true });

// --- Slack -------------------------------------------------------------------
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || "x",
  endpoints: "/slack/events",
});
const slack = new SlackApp({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

slack.message(/^(approve|reject|skip|cap\s+\d+(\.\d+)?)$/i, async ({ message, say }) => {
  const reply = parseReply(message.text);
  await handleApproval({ source: "slack", reply, ack: (t) => say(t) });
});

slack.event("app_mention", async ({ event, say }) => {
  await say(`Hi <@${event.user}> — reply *approve*, *reject*, *skip*, or *cap N* to the latest gate message.`);
});

// --- Telegram ----------------------------------------------------------------
let tg;
if (process.env.TELEGRAM_BOT_TOKEN) {
  tg = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  tg.on("message", async (m) => {
    if (String(m.chat.id) !== String(process.env.TELEGRAM_CHAT_ID)) return;
    const reply = parseReply(m.text || "");
    if (!reply) return;
    await handleApproval({
      source: "telegram",
      reply,
      ack: (t) => tg.sendMessage(m.chat.id, t),
    });
  });
}

// --- Express health endpoint (so docker-compose healthcheck works) -----------
const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/", receiver.app);
const port = Number(process.env.APPROVAL_BOT_PORT || 4100);
app.listen(port, () => console.log(`approval-bot listening on :${port}`));

// --- Core --------------------------------------------------------------------
function parseReply(text) {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  if (t === "approve") return { kind: "approve" };
  if (t === "reject" || t === "skip") return { kind: "reject" };
  const m = t.match(/^cap\s+(\d+(?:\.\d+)?)/);
  if (m) return { kind: "cap", value: Number(m[1]) };
  return null;
}

async function handleApproval({ source, reply, ack }) {
  if (!reply) return;
  const pendingFile = await latestPending();
  if (!pendingFile) {
    await ack("No pending approval right now.");
    return;
  }
  const pending = JSON.parse(await fs.readFile(pendingFile, "utf8"));
  pending.decision = reply;
  pending.decided_at = new Date().toISOString();
  pending.decided_via = source;
  await fs.writeFile(pendingFile.replace(".pending.json", ".decided.json"), JSON.stringify(pending, null, 2));
  await fs.unlink(pendingFile);
  await ack(`Recorded ${reply.kind}${reply.value ? " $" + reply.value : ""} for ${pending.kind}.`);
  // n8n polls /app/state/approvals for *.decided.json files and acts on them.
}

async function latestPending() {
  const files = (await fs.readdir(STATE_DIR)).filter((f) => f.endsWith(".pending.json")).sort();
  return files.length ? path.join(STATE_DIR, files[files.length - 1]) : null;
}
