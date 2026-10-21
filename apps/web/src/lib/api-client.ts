import type { ApiError } from "@anytools/shared";

/** Error returned by the API (`{ error: { code, message } }`). */
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/** Browser-side call to the same-origin API (`/api/...`). The visitor cookie travels automatically. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, credentials: "same-origin" });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as ApiError | null)?.error;
    throw new ApiClientError(
      res.status,
      error?.code ?? "internal_error",
      error?.message ?? res.statusText,
    );
  }
  return body as T;
}

export function postJson<T>(
  path: string,
  data: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
}
