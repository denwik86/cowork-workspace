// POST /guardrails/check
// Returns current spend headroom + cap config. The Showrunner workflow calls
// this before queuing the week so the Slack message can show the predicted budget.

import express from "express";
import { assertBudgetHeadroom, caps } from "../../lib/guard_rails.js";

const r = express.Router();

r.post("/check", async (_req, res, next) => {
  try {
    const head = await assertBudgetHeadroom({ adding: 0 }).catch((e) => ({ error: e.message }));
    res.json({ ok: true, caps: caps(), head });
  } catch (e) { next(e); }
});

export default r;
