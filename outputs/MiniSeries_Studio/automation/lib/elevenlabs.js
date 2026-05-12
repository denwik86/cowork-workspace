// ElevenLabs Flash v2.5 streaming TTS wrapper.
// Voices are keyed by character (Maya, Ella, Kiri, etc.) — IDs come from .env.

import axios from "axios";
import fs from "node:fs";
import path from "node:path";

const API = "https://api.elevenlabs.io/v1";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

const VOICES = {
  maya: process.env.ELEVENLABS_VOICE_MAYA,
  future_maya: process.env.ELEVENLABS_VOICE_FUTURE_MAYA,
  ella: process.env.ELEVENLABS_VOICE_ELLA,
  kiri: process.env.ELEVENLABS_VOICE_KIRI,
  narrator_s4: process.env.ELEVENLABS_VOICE_NARRATOR_S4,
};

const DEFAULT_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.75,
  style: 0.2,
  use_speaker_boost: true,
};

/**
 * Render a single VO line to MP3. `character` must match VOICES keys above.
 * Returns the absolute file path of the saved MP3.
 */
export async function tts({ character, text, outFile, settings = {} }) {
  const voiceId = VOICES[character];
  if (!voiceId) throw new Error(`No voice configured for "${character}"`);
  const url = `${API}/text-to-speech/${voiceId}/stream?optimize_streaming_latency=2`;
  const body = {
    text,
    model_id: MODEL,
    voice_settings: { ...DEFAULT_SETTINGS, ...settings },
  };
  const res = await axios.post(url, body, {
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    responseType: "stream",
    timeout: 60_000,
  });
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(outFile);
    res.data.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
  });
  return outFile;
}

/** Batch TTS — accepts an array of {character, text, outFile} and runs sequentially. */
export async function ttsBatch(lines) {
  const results = [];
  for (const line of lines) results.push(await tts(line));
  return results;
}

/** Estimate character count for guard-rail accounting. */
export function charsIn(lines) {
  return lines.reduce((sum, l) => sum + (l.text?.length || 0), 0);
}
