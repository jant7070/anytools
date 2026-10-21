import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileKey } from "./index.js";
import { LocalStorageProvider } from "./local.js";
import { contentDisposition } from "./types.js";

describe("LocalStorageProvider", () => {
  let rootDir: string;
  let storage: LocalStorageProvider;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "anytools-storage-"));
    storage = new LocalStorageProvider({
      rootDir,
      publicBasePath: "/api/files",
      signingSecret: "s3cret",
    });
  });
  afterEach(() => rm(rootDir, { recursive: true, force: true }));

  const put = (key: string, expiresAt: Date) =>
    storage.put({
      key,
      data: Buffer.from("hello"),
      contentType: "text/plain",
      filename: "a.txt",
      expiresAt,
    });

  it("stores and reads files with metadata", async () => {
    const key = createFileKey("results");
    await put(key, new Date(Date.now() + 60_000));
    const file = await storage.get(key);
    expect(file?.data.toString()).toBe("hello");
    expect(file?.filename).toBe("a.txt");
    expect(file?.contentType).toBe("text/plain");
  });

  it("hides and cleans up expired files", async () => {
    const live = createFileKey("results");
    const dead = createFileKey("inputs");
    await put(live, new Date(Date.now() + 60_000));
    await put(dead, new Date(Date.now() - 1000));
    expect(await storage.get(dead)).toBeNull();
    expect(await storage.deleteExpired()).toBe(1);
    expect(await storage.get(live)).not.toBeNull();
  });

  it("signs download URLs and verifies them in constant time", async () => {
    const key = createFileKey("results");
    const expiresAt = new Date(Date.now() + 60_000);
    const url = new URL(
      await storage.getDownloadUrl(key, { filename: "a.txt", expiresAt }),
      "http://x",
    );
    expect(url.pathname).toBe(`/api/files/${key}`);
    const exp = Number(url.searchParams.get("exp"));
    const sig = url.searchParams.get("sig")!;
    expect(storage.verifyDownloadSignature(key, exp, sig)).toBe(true);
    expect(storage.verifyDownloadSignature(createFileKey("results"), exp, sig)).toBe(false);
    expect(storage.verifyDownloadSignature(key, exp + 1, sig)).toBe(false);
    expect(storage.verifyDownloadSignature(key, exp, sig, new Date(exp * 1000 + 1))).toBe(false);
  });

  it("rejects keys that could escape the storage directory", async () => {
    await expect(put("../etc/passwd", new Date())).rejects.toThrow(/Invalid storage key/);
    await expect(storage.get("results/../../x")).rejects.toThrow(/Invalid storage key/);
  });

  it("builds RFC 6266 content-disposition headers", () => {
    expect(contentDisposition("foto ñ.png")).toBe(
      `attachment; filename="foto _.png"; filename*=UTF-8''foto%20%C3%B1.png`,
    );
  });
});
