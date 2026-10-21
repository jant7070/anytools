import type { Env } from "../env.js";
import { createApplixirAdProvider } from "./applixir.js";
import { createDevAdProvider } from "./dev.js";
import { createMonetagAdProvider } from "./monetag.js";
import type { AdProvider } from "./types.js";

export type { AdProvider, AdVerification } from "./types.js";

/** Builds the provider selected by AD_PROVIDER (env validation guarantees its settings exist). */
export function createAdProvider(env: Env): AdProvider {
  switch (env.AD_PROVIDER) {
    case "dev":
      return createDevAdProvider(env.DEV_AD_SECONDS);
    case "monetag":
      return createMonetagAdProvider({
        zoneId: env.MONETAG_ZONE_ID ?? "",
        sdkUrl: env.MONETAG_SDK_URL ?? "",
        minSeconds: env.MONETAG_MIN_SECONDS,
      });
    case "applixir":
      return createApplixirAdProvider({
        apiKey: env.APPLIXIR_API_KEY ?? "",
        gameId: env.APPLIXIR_GAME_ID ?? "",
        secret: env.APPLIXIR_SECRET ?? "",
        sdkUrl: env.APPLIXIR_SDK_URL,
      });
  }
}
