import { z } from "zod";

/** Reference to a file persisted through a StorageProvider. */
export const storedFileRefSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  expiresAt: z.iso.datetime(),
});
export type StoredFileRef = z.infer<typeof storedFileRefSchema>;

/** A stored file as returned to the browser: the storage key is replaced by a download URL. */
export const downloadableFileSchema = storedFileRefSchema.omit({ key: true }).extend({
  url: z.string().min(1),
});
export type DownloadableFile = z.infer<typeof downloadableFileSchema>;
