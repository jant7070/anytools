import pino, { type DestinationStream, type LoggerOptions } from "pino";
import type { Env } from "./env.js";

/**
 * Query strings are never logged: some carry secrets (the AppLixir callback sends its secret
 * in plain text) or capabilities (signed download URLs). Only the path is kept.
 */
export function pathOnly(url: string | undefined): string | undefined {
  return url?.split("?")[0];
}

export function createLogger(
  env: Pick<Env, "LOG_LEVEL" | "NODE_ENV">,
  destination?: DestinationStream,
) {
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
      censor: "[redacted]",
    },
    serializers: {
      req: (req: { id?: string; method?: string; url?: string }) => ({
        id: req.id,
        method: req.method,
        url: pathOnly(req.url),
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
      err: pino.stdSerializers.err,
    },
    ...(env.NODE_ENV === "development" && !destination
      ? {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
          },
        }
      : {}),
  };
  return destination ? pino(options, destination) : pino(options);
}
