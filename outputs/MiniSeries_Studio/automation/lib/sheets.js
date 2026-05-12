// Minimal Google Sheets client. Service account JSON path comes from
// GOOGLE_SERVICE_ACCOUNT_JSON in the env. The sheet has 6 tabs:
//   Trends, Plans, Posts, Metrics, KPIs, Reviews
// + a Spend tab the orchestrator writes guard-rail rows into.

import { google } from "googleapis";
import fs from "node:fs";

let _client;

function client() {
  if (_client) return _client;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error(`Missing service account JSON at ${keyPath}`);
  }
  const credentials = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  _client = google.sheets({ version: "v4", auth });
  return _client;
}

const SHEET_ID = process.env.KPI_SHEET_ID;

export async function appendRow(tab, row) {
  if (!SHEET_ID) throw new Error("KPI_SHEET_ID not set");
  const sheets = client();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

export async function readRange(tab, range = "A1:Z2000") {
  const sheets = client();
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!${range}`,
  });
  return r.data.values || [];
}

export async function logSpend({ workflow, episode, vendor, item, usd, meta = {} }) {
  await appendRow("Spend", [
    new Date().toISOString(),
    workflow,
    episode || "",
    vendor,
    item,
    Number(usd).toFixed(4),
    JSON.stringify(meta),
  ]);
}

export async function logTrend(row) {
  await appendRow("Trends", row);
}

export async function logPost(row) {
  await appendRow("Posts", row);
}

export async function logMetrics(row) {
  await appendRow("Metrics", row);
}
