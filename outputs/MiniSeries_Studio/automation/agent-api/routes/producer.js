// POST /producer/build
//   body: { series, episodeNumber }
// Reads /app/media/episodes/<series>_EP<NN>/{script.txt,voice_lines.json,captions.csv}
// and the matching Sora clips in /app/media/shots/, then runs build_episode.sh.
// Returns { outFile, thumbFile }.

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { ttsBatch, charsIn } from "../../lib/elevenlabs.js";
import { assertElevenCharsHeadroom } from "../../lib/guard_rails.js";
import { logSpend as sheetsSpend } from "../../lib/sheets.js";

const r = express.Router();

r.post("/build", async (req, res, next) => {
  try {
    const { series, episodeNumber } = req.body;
    const ep = String(episodeNumber).padStart(2, "0");
    const epDir = `/app/media/episodes/${series}_EP${ep}`;
    const lines = JSON.parse(await fs.readFile(path.join(epDir, "voice_lines.json"), "utf8"));

    // ----- 1) Voiceover via ElevenLabs -----
    const totalChars = charsIn(lines);
    await assertElevenCharsHeadroom(totalChars);
    const voiceDir = `/app/media/voice/${series}_EP${ep}`;
    await fs.mkdir(voiceDir, { recursive: true });
    const ttsJobs = lines.map((l, i) => ({
      character: l.character,
      text: l.text,
      outFile: path.join(voiceDir, `line_${String(i + 1).padStart(2, "0")}.mp3`),
      settings: l.settings,
    }));
    await ttsBatch(ttsJobs);
    await sheetsSpend({
      workflow: "producer",
      episode: `${series}E${episodeNumber}`,
      vendor: "ElevenLabs",
      item: "tts",
      usd: (totalChars / 1000) * 0.05,
      meta: { chars: totalChars },
    }).catch(() => {});

    // Concat VO lines into one mp3 for the FFmpeg pipeline
    const voiceList = path.join(voiceDir, "list.txt");
    await fs.writeFile(
      voiceList,
      ttsJobs.map((j) => `file '${j.outFile}'`).join("\n")
    );
    const voiceMp3 = path.join(voiceDir, "voice.mp3");
    await runOk("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", voiceList, "-c", "copy", voiceMp3]);

    // ----- 2) Run the assembly script -----
    const outFile = `/app/out/${series}_EP${ep}.mp4`;
    const thumbFile = `/app/out/thumb_${series}_EP${ep}.jpg`;
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await runOk("/app/scripts/build_episode.sh", [series, ep], { cwd: "/app" });

    res.json({ ok: true, outFile, thumbFile });
  } catch (e) { next(e); }
});

function runOk(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    );
  });
}

export default r;
