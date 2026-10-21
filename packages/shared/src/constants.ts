export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export const TOOL_RUN_MODES = ["sync", "queue"] as const;
export type ToolRunMode = (typeof TOOL_RUN_MODES)[number];

export const TOOL_STATUSES = ["draft", "published"] as const;
export type ToolStatus = (typeof TOOL_STATUSES)[number];

export const UNLOCK_STATUSES = ["pending", "verified", "expired"] as const;
export type UnlockStatus = (typeof UNLOCK_STATUSES)[number];

export const AD_PROVIDERS = ["dev", "monetag", "applixir"] as const;
export type AdProviderName = (typeof AD_PROVIDERS)[number];

/** How long a verified ad keeps a single tool unlocked. */
export const UNLOCK_TOKEN_TTL_SECONDS = 5 * 60;

/** How long a pending unlock session may wait for its ad before it is discarded. */
export const UNLOCK_SESSION_PENDING_TTL_SECONDS = 15 * 60;

/** Lifetime of generated result files (images, PDFs). */
export const RESULT_FILE_TTL_SECONDS = 30 * 60;

/** Name of the signed, httpOnly cookie that identifies an anonymous visitor. */
export const VISITOR_COOKIE_NAME = "at_vid";

/** Days included in the "most used" ranking. */
export const POPULAR_WINDOW_DAYS = 7;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
