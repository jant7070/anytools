import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  assertValidKey,
  type PutFileInput,
  type StorageProvider,
  type StoredFile,
} from "./types.js";

export interface LocalStorageOptions {
  /** Directory shared by API and worker (a Docker volume in containers). */
  rootDir: string;
  /** Public path of the API route that serves files, e.g. `/api/files`. */
  publicBasePath: string;
  /** Secret used to sign download URLs. */
  signingSecret: string;
}

interface Meta {
  contentType: string;
  filename: string;
  expiresAt: string;
}

/** Development storage on the local filesystem with HMAC-signed download URLs. */
export class LocalStorageProvider implements StorageProvider {
  readonly driver = "local" as const;

  constructor(private readonly options: LocalStorageOptions) {}

  private path(key: string): string {
    assertValidKey(key);
    return join(this.options.rootDir, key);
  }

  async put(input: PutFileInput): Promise<void> {
    const path = this.path(input.key);
    await mkdir(dirname(path), { recursive: true });
    const meta: Meta = {
      contentType: input.contentType,
      filename: input.filename,
      expiresAt: input.expiresAt.toISOString(),
    };
    // Metadata first: cleanup iterates metadata files, so a crash never leaves an untracked file.
    await writeFile(`${path}.meta.json`, JSON.stringify(meta));
    await writeFile(path, input.data);
  }

  async get(key: string): Promise<StoredFile | null> {
    const path = this.path(key);
    try {
      const meta = JSON.parse(await readFile(`${path}.meta.json`, "utf8")) as Meta;
      const expiresAt = new Date(meta.expiresAt);
      if (expiresAt.getTime() <= Date.now()) return null;
      return {
        data: await readFile(path),
        contentType: meta.contentType,
        filename: meta.filename,
        expiresAt,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.path(key);
    await rm(path, { force: true });
    await rm(`${path}.meta.json`, { force: true });
  }

  private sign(key: string, exp: number): string {
    return createHmac("sha256", this.options.signingSecret)
      .update(`${key}:${exp}`)
      .digest("base64url");
  }

  async getDownloadUrl(
    key: string,
    options: { filename: string; expiresAt: Date },
  ): Promise<string> {
    assertValidKey(key);
    const exp = Math.floor(options.expiresAt.getTime() / 1000);
    const params = new URLSearchParams({ exp: String(exp), sig: this.sign(key, exp) });
    return `${this.options.publicBasePath}/${key}?${params.toString()}`;
  }

  /** Verifies a signature produced by getDownloadUrl (constant-time comparison). */
  verifyDownloadSignature(key: string, exp: number, sig: string, now = new Date()): boolean {
    if (!Number.isInteger(exp) || exp * 1000 <= now.getTime()) return false;
    const expected = Buffer.from(this.sign(key, exp));
    const actual = Buffer.from(sig);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  async deleteExpired(now = new Date()): Promise<number> {
    let removed = 0;
    for (const prefix of ["inputs", "results"]) {
      const dir = join(this.options.rootDir, prefix);
      let entries: string[];
      try {
        entries = await readdir(dir);
      } catch {
        continue;
      }
      for (const entry of entries.filter((name) => name.endsWith(".meta.json"))) {
        const key = `${prefix}/${entry.slice(0, -".meta.json".length)}`;
        try {
          const meta = JSON.parse(await readFile(join(dir, entry), "utf8")) as Meta;
          if (new Date(meta.expiresAt).getTime() > now.getTime()) continue;
        } catch {
          // Unreadable metadata: treat as expired garbage.
        }
        await this.delete(key);
        removed++;
      }
    }
    return removed;
  }
}
