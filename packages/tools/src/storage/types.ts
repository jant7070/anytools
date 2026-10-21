export interface PutFileInput {
  key: string;
  data: Buffer;
  contentType: string;
  filename: string;
  expiresAt: Date;
}

export interface StoredFile {
  data: Buffer;
  contentType: string;
  filename: string;
  expiresAt: Date;
}

/**
 * Where uploaded inputs and generated results live. Implementations must be safe to share
 * between API and worker replicas (no in-process state).
 */
export interface StorageProvider {
  readonly driver: "local" | "s3";
  put(input: PutFileInput): Promise<void>;
  /** Returns null when the file does not exist or has expired. */
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
  /** A time-limited URL the browser can download the file from. */
  getDownloadUrl(key: string, options: { filename: string; expiresAt: Date }): Promise<string>;
  /** Deletes expired files and returns how many were removed. Run periodically by the worker. */
  deleteExpired(now?: Date): Promise<number>;
}

export const FILE_KEY_PATTERN = /^(inputs|results)\/[0-9a-f-]{36}$/;

export function assertValidKey(key: string): void {
  if (!FILE_KEY_PATTERN.test(key)) throw new Error(`Invalid storage key: ${key}`);
}

/** RFC 6266 Content-Disposition with an ASCII fallback and a UTF-8 filename. */
export function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
