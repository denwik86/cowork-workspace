// Long-running daemon that consumes Sora prompt jobs queued by the Showrunner.
// Job files live at /app/media/queue/sora/*.json and have shape:
//   { id, series, episode, shot, prompt, aspect, duration }
//
// On success the worker writes the resulting MP4 to
//   /app/media/shots/<series>_EP<NN>_shot<N>.mp4
// and deletes the job file.

import fs from "node:fs/promises";
import path from "node:path";
import { soraOpen, soraGenerate } from "./sora_playwright.js";

const QUEUE = "/app/media/queue/sora";
const SHOTS = "/app/media/shots";
const POLL_MS = 30_000;

const dailyBudget = Number(process.env.SORA_DAILY_CLIP_BUDGET || 12);
let todayKey = new Date().toISOString().slice(0, 10);
let usedToday = 0;

(async function loop() {
  for (;;) {
    try {
      rolloverIfNewDay();
      if (usedToday >= dailyBudget) {
        log(`Daily Sora budget reached (${usedToday}/${dailyBudget}); sleeping.`);
        await sleep(POLL_MS);
        continue;
      }
      const jobs = await listJobs();
      if (jobs.length === 0) { await sleep(POLL_MS); continue; }

      const ctx = await soraOpen();
      try {
        for (const jobFile of jobs) {
          if (usedToday >= dailyBudget) break;
          const job = JSON.parse(await fs.readFile(jobFile, "utf8"));
          log(`Generating ${job.id} (${job.series} EP${job.episode} shot ${job.shot})`);
          const out = await soraGenerate(ctx, {
            prompt: job.prompt,
            outDir: SHOTS,
            aspect: job.aspect || "9:16",
            duration: job.duration || 5,
          });
          const target = path.join(
            SHOTS,
            `${job.series}_EP${String(job.episode).padStart(2, "0")}_shot${job.shot}.mp4`
          );
          await fs.rename(out, target);
          await fs.unlink(jobFile);
          usedToday++;
          log(`✓ ${target}  (today ${usedToday}/${dailyBudget})`);
        }
      } finally {
        await ctx.close();
      }
    } catch (err) {
      log(`worker error: ${err.message}`);
    }
    await sleep(POLL_MS);
  }
})();

async function listJobs() {
  await fs.mkdir(QUEUE, { recursive: true });
  const files = await fs.readdir(QUEUE);
  return files
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(QUEUE, f));
}

function rolloverIfNewDay() {
  const k = new Date().toISOString().slice(0, 10);
  if (k !== todayKey) { todayKey = k; usedToday = 0; }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function log(s) { console.log(`[sora-worker ${new Date().toISOString()}] ${s}`); }
