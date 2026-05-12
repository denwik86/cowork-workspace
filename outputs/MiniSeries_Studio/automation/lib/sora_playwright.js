// Sora driver via Playwright. Sora has no public API as of May 2026,
// so we drive the web UI. This is best-effort and rate-limited.
//
// Usage:
//   const ctx = await soraOpen();
//   const file = await soraGenerate(ctx, { prompt, outDir });
//   await ctx.close();
//
// State (cookies, generation index) lives at /app/state/sora.

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const STATE_DIR = "/app/state";
const STORAGE = path.join(STATE_DIR, "sora_storage.json");

export async function soraOpen() {
  await fs.mkdir(STATE_DIR, { recursive: true });
  const headless = String(process.env.SORA_HEADLESS || "true") === "true";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState: (await fileExists(STORAGE)) ? STORAGE : undefined,
  });
  const page = await context.newPage();
  await page.goto("https://sora.com/");
  await ensureLoggedIn(page);
  await context.storageState({ path: STORAGE });
  return {
    page,
    close: async () => {
      await context.storageState({ path: STORAGE });
      await browser.close();
    },
  };
}

async function ensureLoggedIn(page) {
  // If we land on the editor, we're in. Otherwise, do an OAuth login.
  const loggedIn = await page
    .locator("text=/Generate|New video|Library/i")
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  if (loggedIn) return;

  const email = process.env.SORA_EMAIL;
  const password = process.env.SORA_PASSWORD;
  if (!email || !password) {
    throw new Error("Sora not logged in and SORA_EMAIL/SORA_PASSWORD not provided");
  }
  // Sora uses OpenAI auth; the exact selectors drift, so this is a best-effort path.
  await page.getByRole("button", { name: /log in|sign in/i }).click().catch(() => {});
  await page.fill('input[type="email"]', email);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /continue|log in/i }).click();
  await page.waitForLoadState("networkidle");
}

/** Generate one 9:16, 5s clip for the given prompt. Returns local file path. */
export async function soraGenerate(ctx, { prompt, outDir, aspect = "9:16", duration = 5 }) {
  const { page } = ctx;
  await page.goto("https://sora.com/");
  await page.waitForLoadState("domcontentloaded");

  // Open the new-video composer (selector may change — see TROUBLESHOOTING.md).
  await page.getByRole("button", { name: /new video|generate|create/i }).first().click();

  // Type the prompt.
  const textbox = page.getByRole("textbox").first();
  await textbox.click();
  await textbox.fill(prompt);

  // Set aspect + duration if the controls are present.
  await trySelect(page, /aspect|orientation/i, aspect);
  await trySelect(page, /duration|length/i, `${duration}s`);

  // Submit.
  await page
    .getByRole("button", { name: /^generate$|^create$|^submit$/i })
    .first()
    .click();

  // Wait for the first download/share affordance to appear (up to 6 min).
  const dlPromise = page.waitForEvent("download", { timeout: 6 * 60_000 });
  await page
    .getByRole("button", { name: /download/i })
    .first()
    .click({ timeout: 6 * 60_000 });
  const download = await dlPromise;

  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${Date.now()}.mp4`);
  await download.saveAs(file);
  return file;
}

async function trySelect(page, label, value) {
  try {
    const ctrl = page.getByLabel(label).first();
    if (await ctrl.isVisible({ timeout: 1000 })) {
      await ctrl.click();
      await page.getByText(value, { exact: true }).first().click({ timeout: 2000 });
    }
  } catch { /* ignore — fall back to defaults */ }
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
