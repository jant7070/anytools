import { z } from "zod";

export const PIXELATE_MODES = ["pixelate", "blur"] as const;
export const PIXELATE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PIXELATE_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const pixelateImageInput = z.object({
  mode: z.enum(PIXELATE_MODES).default("pixelate"),
  /** 1 = subtle, 100 = strongest. Scaled to the image size so results look alike at any resolution. */
  intensity: z.number().int().min(1).max(100).default(50),
});

export const pixelateImageOutput = z.object({
  mode: z.enum(PIXELATE_MODES),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.enum(["jpeg", "png", "webp"]),
});

export type PixelateImageInput = z.input<typeof pixelateImageInput>;
export type PixelateImageOutput = z.output<typeof pixelateImageOutput>;
