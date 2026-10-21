import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { FastifyRequest } from "fastify";

export interface ClientInfoOptions {
  trustCloudflareHeaders: boolean;
  ipHashSalt: string;
}

function header(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Client IP. Behind Cloudflare the real IP is in `CF-Connecting-IP`; this header is only
 * trusted when explicitly enabled (the origin must not be reachable without Cloudflare).
 */
export function clientIp(
  request: FastifyRequest,
  options: Pick<ClientInfoOptions, "trustCloudflareHeaders">,
): string {
  if (options.trustCloudflareHeaders) {
    const cf = header(request, "cf-connecting-ip")?.trim();
    if (cf && isIP(cf)) return cf;
  }
  return request.ip;
}

/** ISO country code from Cloudflare (`CF-IPCountry`), or null. */
export function clientCountry(
  request: FastifyRequest,
  options: Pick<ClientInfoOptions, "trustCloudflareHeaders">,
): string | null {
  if (!options.trustCloudflareHeaders) return null;
  const country = header(request, "cf-ipcountry")?.toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : null;
}

/** Salted one-way hash so raw IPs are never stored. */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
