// Thin wrapper around the Anthropic SDK with prompt caching baked in.
// All Showrunner / Trend Scout / Marketer calls go through this.

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SONNET = process.env.ANTHROPIC_SONNET_MODEL || "claude-sonnet-4-6";
const HAIKU = process.env.ANTHROPIC_HAIKU_MODEL || "claude-haiku-4-5-20251001";

/**
 * Run a Claude call. `system` is a string OR a list of blocks (so callers
 * can mark big chunks with `cache_control: { type: "ephemeral" }`).
 */
export async function callClaude({
  model = "sonnet",
  system,
  messages,
  maxTokens = 2000,
  temperature = 0.7,
  cache = true,
}) {
  const sys = normaliseSystem(system, cache);
  const resp = await client.messages.create({
    model: model === "haiku" ? HAIKU : SONNET,
    max_tokens: maxTokens,
    temperature,
    system: sys,
    messages,
  });
  return {
    text: resp.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
    usage: resp.usage, // includes cache_read_input_tokens / cache_creation_input_tokens
    model: resp.model,
    raw: resp,
  };
}

function normaliseSystem(system, cache) {
  if (!system) return undefined;
  if (typeof system === "string") {
    return cache
      ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
      : [{ type: "text", text: system }];
  }
  return system;
}

/** Load a markdown prompt from /app/prompts (or any path). */
export async function loadPrompt(name) {
  const p = name.startsWith("/")
    ? name
    : path.join("/app/prompts", name.endsWith(".md") ? name : `${name}.md`);
  return fs.readFile(p, "utf8");
}

/** Convenience: write a small log row to stdout that the analyst can grep. */
export function logSpend({ workflow, episode, model, usage }) {
  // Approximate $ cost. Pricing: Sonnet 4.6 = $3/$15 per 1M (in/out); Haiku 4.5 = $0.80/$4.
  const rate = model.includes("haiku")
    ? { in: 0.8e-6, out: 4e-6, cached: 0.08e-6 }
    : { in: 3e-6, out: 15e-6, cached: 0.3e-6 };
  const inp = (usage.input_tokens || 0) * rate.in;
  const out = (usage.output_tokens || 0) * rate.out;
  const cached = (usage.cache_read_input_tokens || 0) * rate.cached;
  const cost = +(inp + out + cached).toFixed(4);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      kind: "spend",
      workflow,
      episode,
      model,
      usage,
      cost_usd: cost,
      ts: new Date().toISOString(),
    })
  );
  return cost;
}
