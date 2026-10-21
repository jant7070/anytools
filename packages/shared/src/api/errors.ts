import { z } from "zod";

export const API_ERROR_CODES = [
  "bad_request",
  "validation_failed",
  "not_found",
  "unlock_required",
  "unlock_token_expired",
  "unlock_token_tool_mismatch",
  "unlock_session_not_found",
  "turnstile_failed",
  "ad_provider_unavailable",
  "rate_limited",
  "payload_too_large",
  "unsupported_media_type",
  "tool_failed",
  "tool_timeout",
  "internal_error",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
