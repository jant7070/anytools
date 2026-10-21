import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { clientCountry, clientIp } from "./client-info.js";

const request = (headers: Record<string, string>, ip = "10.0.0.1") =>
  ({ headers, ip }) as unknown as FastifyRequest;

describe("clientIp", () => {
  it("ignores Cloudflare headers unless explicitly trusted", () => {
    const req = request({ "cf-connecting-ip": "203.0.113.7" });
    expect(clientIp(req, { trustCloudflareHeaders: false })).toBe("10.0.0.1");
    expect(clientIp(req, { trustCloudflareHeaders: true })).toBe("203.0.113.7");
  });

  it("falls back to the socket/proxy IP when the header is not a valid IP", () => {
    for (const value of ["not-an-ip", "1.2.3.4, 5.6.7.8", "<script>", ""]) {
      expect(
        clientIp(request({ "cf-connecting-ip": value }), { trustCloudflareHeaders: true }),
      ).toBe("10.0.0.1");
    }
    expect(
      clientIp(request({ "cf-connecting-ip": "2001:db8::1" }), { trustCloudflareHeaders: true }),
    ).toBe("2001:db8::1");
  });

  it("only accepts two-letter country codes", () => {
    const opts = { trustCloudflareHeaders: true };
    expect(clientCountry(request({ "cf-ipcountry": "es" }), opts)).toBe("ES");
    expect(clientCountry(request({ "cf-ipcountry": "XX" }), opts)).toBeNull();
    expect(clientCountry(request({ "cf-ipcountry": "ESP" }), opts)).toBeNull();
  });
});
