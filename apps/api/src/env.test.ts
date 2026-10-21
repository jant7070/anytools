import { describe, expect, it } from "vitest";
import { EnvError, loadEnv } from "./env.js";

const base = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  COOKIE_SECRET: "c".repeat(32),
  UNLOCK_JWT_SECRET: "j".repeat(32),
  IP_HASH_SALT: "s".repeat(16),
  FILE_SIGNING_SECRET: "f".repeat(32),
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};

describe("loadEnv", () => {
  it("applies defaults", () => {
    const env = loadEnv(base);
    expect(env).toMatchObject({
      PORT: 4000,
      AD_PROVIDER: "dev",
      SHOW_DRAFT_TOOLS: true,
      COOKIE_SECURE: false,
    });
  });

  it("lists every missing variable in one clear error", () => {
    expect(() => loadEnv({})).toThrow(EnvError);
    try {
      loadEnv({});
    } catch (error) {
      const message = (error as Error).message;
      for (const key of [
        "DATABASE_URL",
        "REDIS_URL",
        "COOKIE_SECRET",
        "UNLOCK_JWT_SECRET",
        "TURNSTILE_SECRET_KEY",
      ]) {
        expect(message).toContain(key);
      }
    }
  });

  it("requires provider settings and blocks the dev provider in production", () => {
    expect(() => loadEnv({ ...base, AD_PROVIDER: "applixir" })).toThrow(/APPLIXIR_SECRET/);
    expect(() => loadEnv({ ...base, AD_PROVIDER: "monetag" })).toThrow(/MONETAG_ZONE_ID/);
    expect(() => loadEnv({ ...base, NODE_ENV: "production" })).toThrow(/dev` ad provider/);
    const prod = loadEnv({ ...base, NODE_ENV: "production", ALLOW_DEV_AD_PROVIDER: "true" });
    expect(prod).toMatchObject({ COOKIE_SECURE: true, SHOW_DRAFT_TOOLS: false });
  });

  it("requires S3 credentials for the s3 storage driver", () => {
    expect(() => loadEnv({ ...base, STORAGE_DRIVER: "s3" })).toThrow(/S3_BUCKET/);
  });

  it("parses TRUST_PROXY as boolean, hop count or address list", () => {
    expect(loadEnv(base).TRUST_PROXY).toBe(false);
    expect(loadEnv({ ...base, TRUST_PROXY: "1" }).TRUST_PROXY).toBe(1);
    expect(loadEnv({ ...base, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(true);
    expect(loadEnv({ ...base, TRUST_PROXY: "10.0.0.0/8, 172.16.0.1" }).TRUST_PROXY).toEqual([
      "10.0.0.0/8",
      "172.16.0.1",
    ]);
  });

  it("treats blank variables as unset (compose `${VAR:-}` placeholders)", () => {
    const env = loadEnv({ ...base, PORT: "", MONETAG_ZONE_ID: "", S3_ENDPOINT: "  " });
    expect(env.PORT).toBe(4000);
    expect(env.MONETAG_ZONE_ID).toBeUndefined();
    expect(env.S3_ENDPOINT).toBeUndefined();
  });
});
