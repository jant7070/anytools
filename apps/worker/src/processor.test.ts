import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeJobError, type ToolJobData, type ToolJobResult } from "@anytools/shared";
import { toolRegistry } from "@anytools/tools";
import { createFileKey, LocalStorageProvider } from "@anytools/tools/storage";
import { type Job, UnrecoverableError } from "bullmq";
import pino from "pino";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createToolProcessor } from "./processor.js";

const logger = pino({ level: "silent" });

function fakeJob(data: ToolJobData): Job<ToolJobData, ToolJobResult> {
  return { id: "job-1", data } as Job<ToolJobData, ToolJobResult>;
}

describe("tool job processor", () => {
  let rootDir: string;
  let storage: LocalStorageProvider;
  let process: ReturnType<typeof createToolProcessor>;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "anytools-worker-"));
    storage = new LocalStorageProvider({
      rootDir,
      publicBasePath: "/api/files",
      signingSecret: "x".repeat(32),
    });
    process = createToolProcessor({ registry: toolRegistry, storage, logger });
  });
  afterEach(() => rm(rootDir, { recursive: true, force: true }));

  async function uploadPng() {
    const data = await sharp({
      create: { width: 40, height: 20, channels: 3, background: "#3366ff" },
    })
      .png()
      .toBuffer();
    const key = createFileKey("inputs");
    await storage.put({
      key,
      data,
      contentType: "image/png",
      filename: "cat.png",
      expiresAt: new Date(Date.now() + 60_000),
    });
    return { key, filename: "cat.png", contentType: "image/png", size: data.length };
  }

  const baseData = (
    files: ToolJobData["files"],
    input: unknown = { mode: "pixelate", intensity: 50 },
  ): ToolJobData => ({
    toolSlug: "pixelate-image",
    input,
    files,
    visitorId: "00000000-0000-4000-8000-000000000000",
    requestedAt: new Date().toISOString(),
  });

  it("runs the tool, stores the result and deletes the input", async () => {
    const input = await uploadPng();
    const result = await process(fakeJob(baseData([input])));

    expect(result.output).toEqual({ mode: "pixelate", width: 40, height: 20, format: "png" });
    expect(result.files).toHaveLength(1);
    const file = result.files[0]!;
    expect(file).toMatchObject({ filename: "cat-pixelate.png", contentType: "image/png" });
    expect(new Date(file.expiresAt).getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);

    const stored = await storage.get(file.key);
    expect((await sharp(stored!.data).metadata()).width).toBe(40);
    expect(await storage.get(input.key)).toBeNull();
  });

  it("fails without retry and with a user-safe error for invalid input", async () => {
    const input = await uploadPng();
    const error = await process(fakeJob(baseData([input], { mode: "explode" }))).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(UnrecoverableError);
    expect(decodeJobError((error as Error).message)).toMatchObject({ code: "validation_failed" });
    expect(await storage.get(input.key)).toBeNull();
  });

  it("reports expired uploads and unknown tools", async () => {
    const missing = {
      key: createFileKey("inputs"),
      filename: "x.png",
      contentType: "image/png",
      size: 1,
    };
    const expired = await process(fakeJob(baseData([missing]))).catch((e: unknown) => e);
    expect(decodeJobError((expired as Error).message).code).toBe("validation_failed");

    const unknown = await process(
      fakeJob({ ...baseData([]), toolSlug: "password-generator" }),
    ).catch((e: unknown) => e);
    expect(unknown).toBeInstanceOf(UnrecoverableError);
  });
});
