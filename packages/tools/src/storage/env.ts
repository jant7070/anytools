import { isAbsolute, resolve } from "node:path";
import { RESULT_FILE_TTL_SECONDS } from "@anytools/shared";
import { z } from "zod";
import type { StorageConfig } from "./index.js";

/** Storage-related environment variables, shared by the API and the worker. */
export const storageEnvShape = {
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  /** Relative paths resolve from the process working directory. */
  STORAGE_LOCAL_DIR: z.string().min(1).default("../../.storage"),
  FILE_SIGNING_SECRET: z.string().min(32).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
};

export const storageEnvSchema = z.object(storageEnvShape);
export type StorageEnv = z.infer<typeof storageEnvSchema>;

/** Adds "required when…" issues for the selected driver. Use inside a schema's superRefine. */
export function refineStorageEnv(env: StorageEnv, ctx: z.RefinementCtx): void {
  if (env.STORAGE_DRIVER === "local" && !env.FILE_SIGNING_SECRET) {
    ctx.addIssue({
      code: "custom",
      path: ["FILE_SIGNING_SECRET"],
      message: "required when STORAGE_DRIVER=local (min 32 chars)",
    });
  }
  if (env.STORAGE_DRIVER === "s3") {
    for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
      if (!env[key])
        ctx.addIssue({ code: "custom", path: [key], message: "required when STORAGE_DRIVER=s3" });
    }
  }
}

export function storageConfigFromEnv(env: StorageEnv): StorageConfig {
  if (env.STORAGE_DRIVER === "local") {
    return {
      driver: "local",
      rootDir: isAbsolute(env.STORAGE_LOCAL_DIR)
        ? env.STORAGE_LOCAL_DIR
        : resolve(env.STORAGE_LOCAL_DIR),
      publicBasePath: "/api/files",
      signingSecret: env.FILE_SIGNING_SECRET ?? "",
    };
  }
  return {
    driver: "s3",
    bucket: env.S3_BUCKET ?? "",
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    ttlSeconds: RESULT_FILE_TTL_SECONDS,
  };
}
