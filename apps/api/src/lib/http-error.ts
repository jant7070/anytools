import type { ApiErrorCode } from "@anytools/shared";

/** An error that maps directly to an API error response. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (message = "Not found") => new HttpError(404, "not_found", message);
