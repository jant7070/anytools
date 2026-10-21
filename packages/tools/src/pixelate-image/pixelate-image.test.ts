import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { ToolInputFile } from "../define-tool.js";
import { ToolInputError } from "../errors.js";
import { executeTool } from "../execute.js";
import { createTestOptions } from "../test-utils/context.js";
import { blurSigma, pixelateImage, pixelBlockSize } from "./index.js";
import type { PixelateImageOutput } from "./schema.js";

const WIDTH = 200;
const HEIGHT = 100;

/** A PNG where every pixel differs from its neighbours, so pixelation is measurable. */
async function noisyPng(): Promise<Buffer> {
  const raw = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919) % 256;
  return sharp(raw, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
    .png()
    .toBuffer();
}

function imageFile(data: Buffer, contentType = "image/png"): ToolInputFile {
  return { filename: "photo.png", contentType, size: data.length, data };
}

async function pixels(data: Buffer) {
  return sharp(data).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

describe("pixelate-image", () => {
  it("computes block size and sigma relative to the image", () => {
    expect(pixelBlockSize(100, 100)).toBe(10);
    expect(pixelBlockSize(100, 1)).toBe(2);
    expect(blurSigma(1000, 100)).toBe(30);
    expect(blurSigma(10, 1)).toBe(0.3);
  });

  it("pixelates into uniform blocks and keeps dimensions and format", async () => {
    const { options, saved } = createTestOptions([imageFile(await noisyPng())]);
    const output = (await executeTool(
      pixelateImage,
      { mode: "pixelate", intensity: 100 },
      options,
    )) as PixelateImageOutput;

    expect(output).toEqual({ mode: "pixelate", width: WIDTH, height: HEIGHT, format: "png" });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.contentType).toBe("image/png");
    expect(saved[0]?.filename).toBe("photo-pixelate.png");

    // intensity 100 on a 100px short side → 10px blocks: the first block is a single colour.
    const { data, info } = await pixels(saved[0]!.data);
    expect(info.width).toBe(WIDTH);
    const at = (x: number, y: number) =>
      data.subarray((y * WIDTH + x) * 3, (y * WIDTH + x) * 3 + 3);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) expect([...at(x, y)]).toEqual([...at(0, 0)]);
    }
    expect([...at(10, 0)]).not.toEqual([...at(0, 0)]);
  });

  it("blurs the image (neighbouring pixels become similar)", async () => {
    const original = await noisyPng();
    const { options, saved } = createTestOptions([imageFile(original)]);
    await executeTool(pixelateImage, { mode: "blur", intensity: 80 }, options);

    const before = await pixels(original);
    const after = await pixels(saved[0]!.data);
    const roughness = (buf: Buffer) => {
      let sum = 0;
      for (let i = 3; i < buf.length; i++) sum += Math.abs(buf[i]! - buf[i - 3]!);
      return sum / buf.length;
    };
    expect(after.info.width).toBe(WIDTH);
    expect(roughness(after.data)).toBeLessThan(roughness(before.data) / 4);
  });

  it("rejects missing files, wrong MIME types and non-images", async () => {
    await expect(
      executeTool(pixelateImage, {}, createTestOptions([]).options),
    ).rejects.toBeInstanceOf(ToolInputError);

    const png = await noisyPng();
    await expect(
      executeTool(pixelateImage, {}, createTestOptions([imageFile(png, "image/gif")]).options),
    ).rejects.toBeInstanceOf(ToolInputError);

    const garbage = Buffer.from("definitely not an image");
    await expect(
      executeTool(pixelateImage, {}, createTestOptions([imageFile(garbage)]).options),
    ).rejects.toBeInstanceOf(ToolInputError);

    // Valid PNG header, truncated pixel data.
    const truncated = png.subarray(0, Math.floor(png.length / 2));
    await expect(
      executeTool(pixelateImage, {}, createTestOptions([imageFile(truncated)]).options),
    ).rejects.toBeInstanceOf(ToolInputError);
  });
});
