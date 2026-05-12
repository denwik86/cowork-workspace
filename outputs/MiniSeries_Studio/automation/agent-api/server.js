// Agent API — thin HTTP server that n8n calls to do "smart" work.
// Each route is implemented in routes/*.js and shares the libraries in /app/lib.
//
// Auth: every route requires Authorization: Bearer ${AGENT_API_SHARED_SECRET}.

import "dotenv/config";
import express from "express";
import pino from "pino";

import showrunner from "./routes/showrunner.js";
import producer from "./routes/producer.js";
import analyst from "./routes/analyst.js";
import marketer from "./routes/marketer.js";
import trendScout from "./routes/trend-scout.js";
import publisher from "./routes/publisher.js";
import guardrails from "./routes/guardrails.js";

const log = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();
app.use(express.json({ limit: "8mb" }));

// --- Auth middleware (skip /health) -----------------------------------------
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const got = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!process.env.AGENT_API_SHARED_SECRET) {
    return res.status(500).json({ error: "AGENT_API_SHARED_SECRET not set" });
  }
  if (got !== process.env.AGENT_API_SHARED_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/showrunner", showrunner);
app.use("/producer", producer);
app.use("/analyst", analyst);
app.use("/marketer", marketer);
app.use("/trend-scout", trendScout);
app.use("/publisher", publisher);
app.use("/guardrails", guardrails);

app.use((err, _req, res, _next) => {
  log.error({ err }, "unhandled");
  res.status(500).json({ error: err.message });
});

const port = Number(process.env.AGENT_API_PORT || 4000);
app.listen(port, () => log.info({ port }, "agent-api listening"));
