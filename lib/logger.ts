import pino from "pino";
import { formatApiKey } from "./utils";

const pinoConfig = {
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["apiKey", "key", "*.apiKey", "*.key"],
    censor: (value: unknown) => {
      if (typeof value === "string") {
        return formatApiKey(value);
      }
      return "[REDACTED]";
    },
  },
};

const logger = pino(pinoConfig);

export default logger;
