import { defineTool } from "../define-tool.js";
import { ToolInputError } from "../errors.js";
import {
  PIXELATE_ACCEPTED_TYPES,
  PIXELATE_MAX_FILE_BYTES,
  pixelateImageInput,
  pixelateImageOutput,
} from "./schema.js";

const FORMATS = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
type OutputFormat = keyof typeof FORMATS;

/** Pixel block size: up to 10% of the shortest side at intensity 100. */
export function pixelBlockSize(minSide: number, intensity: number): number {
  return Math.max(2, Math.min(minSide, Math.round((minSide * intensity) / 1000)));
}

/** Gaussian sigma: up to 3% of the shortest side at intensity 100 (sharp accepts 0.3–1000). */
export function blurSigma(minSide: number, intensity: number): number {
  return Math.min(1000, Math.max(0.3, (minSide * intensity * 0.03) / 100));
}

function baseName(filename: string): string {
  const name = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w-]+/g, "-")
    .slice(0, 60);
  return name || "image";
}

export const pixelateImage = defineTool({
  slug: "pixelate-image",
  runMode: "queue",
  input: pixelateImageInput,
  output: pixelateImageOutput,
  files: { accept: PIXELATE_ACCEPTED_TYPES, minFiles: 1, maxFiles: 1 },
  limits: { maxInputBytes: PIXELATE_MAX_FILE_BYTES, timeoutMs: 30_000 },
  handler: async (input, ctx) => {
    const file = ctx.files[0];
    if (!file) throw new ToolInputError("An image is required");
    // Loaded lazily so the API process (which only runs sync tools) never loads libvips.
    const { default: sharp } = await import("sharp");

    const metadata = await sharp(file.data)
      .metadata()
      .catch(() => {
        throw new ToolInputError("The file is not a valid image");
      });
    const format = metadata.format as string | undefined;
    if (format !== "jpeg" && format !== "png" && format !== "webp") {
      throw new ToolInputError("Only JPEG, PNG and WebP images are supported");
    }

    // Apply EXIF orientation up front; sharp drops all metadata (EXIF/GPS) on output by default.
    // This is the first full decode: a valid header with corrupt pixel data fails here.
    const { data: upright, info } = await sharp(file.data, { limitInputPixels: 50_000_000 })
      .rotate()
      .toBuffer({ resolveWithObject: true })
      .catch(() => {
        throw new ToolInputError("The image is corrupted or too large to process");
      });
    ctx.signal.throwIfAborted();

    const { width, height } = info;
    const minSide = Math.min(width, height);
    let pipeline;
    if (input.mode === "pixelate") {
      const block = pixelBlockSize(minSide, input.intensity);
      const small = await sharp(upright)
        .resize(Math.max(1, Math.ceil(width / block)), Math.max(1, Math.ceil(height / block)), {
          kernel: "nearest",
          fit: "fill",
        })
        .toBuffer();
      ctx.signal.throwIfAborted();
      pipeline = sharp(small).resize(width, height, { kernel: "nearest", fit: "fill" });
    } else {
      pipeline = sharp(upright).blur(blurSigma(minSide, input.intensity));
    }

    const outputFormat: OutputFormat = format;
    const data = await pipeline
      .toFormat(outputFormat, outputFormat === "png" ? {} : { quality: 90 })
      .toBuffer();
    ctx.signal.throwIfAborted();

    await ctx.saveFile({
      data,
      filename: `${baseName(file.filename)}-${input.mode}.${outputFormat === "jpeg" ? "jpg" : outputFormat}`,
      contentType: FORMATS[outputFormat],
    });
    return { mode: input.mode, width, height, format: outputFormat };
  },
});
