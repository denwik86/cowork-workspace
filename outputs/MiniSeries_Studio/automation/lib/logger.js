import pino from "pino";
const log = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { svc: "agent-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
});
export default log;
