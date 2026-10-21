import { randomUUID } from "node:crypto";
import { LocalStorageProvider, type LocalStorageOptions } from "./local.js";
import { S3StorageProvider, type S3StorageOptions } from "./s3.js";
import type { StorageProvider } from "./types.js";

export * from "./types.js";
export * from "./env.js";
export { LocalStorageProvider, S3StorageProvider };
export type { LocalStorageOptions, S3StorageOptions };

export type StorageConfig =
  ({ driver: "local" } & LocalStorageOptions) | ({ driver: "s3" } & S3StorageOptions);

export function createStorageProvider(config: StorageConfig): StorageProvider {
  return config.driver === "local"
    ? new LocalStorageProvider(config)
    : new S3StorageProvider(config);
}

export function createFileKey(prefix: "inputs" | "results"): string {
  return `${prefix}/${randomUUID()}`;
}
