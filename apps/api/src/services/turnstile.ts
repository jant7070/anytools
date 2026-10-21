const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifier {
  verify(token: string, remoteIp: string): Promise<boolean>;
}

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/** Server-side Turnstile validation through Cloudflare's siteverify endpoint. */
export function createTurnstileVerifier(
  secret: string,
  options: { fetch?: typeof fetch; timeoutMs?: number; onError?: (error: unknown) => void } = {},
): TurnstileVerifier {
  const fetchImpl = options.fetch ?? fetch;
  return {
    async verify(token, remoteIp) {
      try {
        const res = await fetchImpl(SITEVERIFY_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as SiteverifyResponse;
        return body.success === true;
      } catch (error) {
        // Fail closed: if Cloudflare is unreachable the unlock cannot start.
        options.onError?.(error);
        return false;
      }
    },
  };
}
