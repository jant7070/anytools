import { tmpdir } from "node:os";
import { join } from "node:path";

/** Integration tests run against the docker-compose Postgres/Redis (separate DB and Redis index). */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://anytools:anytools@localhost:5442/anytools_test";
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6390/1";

export const APPLIXIR = {
  apiKey: "test-applixir-api-key",
  gameId: "4242",
  secret: "test-applixir-secret-value",
};

export const BASE_TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  LOG_LEVEL: "info",
  DATABASE_URL: TEST_DATABASE_URL,
  DATABASE_POOL_MAX: "3",
  REDIS_URL: TEST_REDIS_URL,
  COOKIE_SECRET: "test-cookie-secret-0123456789abcdefghijklmnop",
  UNLOCK_JWT_SECRET: "test-unlock-jwt-secret-0123456789abcdefghij",
  IP_HASH_SALT: "test-ip-hash-salt",
  FILE_SIGNING_SECRET: "test-file-signing-secret-0123456789abcdefgh",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: join(tmpdir(), "anytools-api-test-storage"),
  TURNSTILE_SECRET_KEY: "unused-in-tests",
  SHOW_DRAFT_TOOLS: "true",
  AD_PROVIDER: "dev",
  DEV_AD_SECONDS: "5",
  MONETAG_MIN_SECONDS: "20",
  APPLIXIR_API_KEY: APPLIXIR.apiKey,
  APPLIXIR_GAME_ID: APPLIXIR.gameId,
  APPLIXIR_SECRET: APPLIXIR.secret,
  UNLOCK_RUNS_PER_MINUTE: "3",
  RATE_LIMIT_GLOBAL_PER_MINUTE: "1000",
  RATE_LIMIT_UNLOCK_START_PER_MINUTE: "1000",
  RATE_LIMIT_RUN_PER_MINUTE: "1000",
  RATE_LIMIT_EVENTS_PER_MINUTE: "1000",
};
