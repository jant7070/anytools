import type { ApiError, ApiErrorCode } from "@anytools/shared";
import { TOOL_ERROR_HTTP, ToolError } from "@anytools/tools";
import type { FastifyError, FastifyInstance, FastifyReply } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { HttpError } from "../lib/http-error.js";

export function sendError(
  reply: FastifyReply,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  const body: ApiError = {
    error: { code, message, ...(details === undefined ? {} : { details }) },
  };
  return reply.code(status).type("application/json").send(body);
}

/** Maps every error to the `{ error: { code, message } }` shape. Internals are never leaked. */
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof HttpError) {
      return sendError(reply, error.statusCode, error.code, error.message, error.details);
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((v) => ({ path: v.instancePath, message: v.message }));
      return sendError(reply, 400, "validation_failed", "Invalid request", details);
    }
    if (error instanceof ToolError) {
      const { status, code } = TOOL_ERROR_HTTP[error.code];
      return sendError(reply, status, code, error.message, error.details);
    }

    const status =
      "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    if (status === 413)
      return sendError(reply, 413, "payload_too_large", "The request is too large");
    if (status === 415)
      return sendError(reply, 415, "unsupported_media_type", "Unsupported content type");
    if (status === 429)
      return sendError(reply, 429, "rate_limited", "Too many requests, slow down");
    if (status >= 400 && status < 500)
      return sendError(reply, status, "bad_request", error.message);

    request.log.error({ err: error }, "unhandled error");
    return sendError(reply, 500, "internal_error", "Something went wrong");
  });

  app.setNotFoundHandler((_request, reply) => sendError(reply, 404, "not_found", "Not found"));
}
