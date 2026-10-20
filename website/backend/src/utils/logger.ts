import pino from "pino";
import pretty from "pino-pretty";

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pretty({
    colorize: true,
    translateTime: "SYS:standard",
    ignore: "pid,hostname",
  }),
);

export default logger;