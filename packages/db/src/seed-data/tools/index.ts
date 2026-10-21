import type { ToolSeed } from "../types.js";
import { compressImageSeed } from "./compress-image.js";
import { convertImageSeed } from "./convert-image.js";
import { mergePdfSeed } from "./merge-pdf.js";
import { passwordGeneratorSeed } from "./password-generator.js";
import { pixelateImageSeed } from "./pixelate-image.js";
import { qrCodeGeneratorSeed } from "./qr-code-generator.js";
import { resizeImageSeed } from "./resize-image.js";
import { splitPdfSeed } from "./split-pdf.js";
import { usernameGeneratorSeed } from "./username-generator.js";
import { wordCounterSeed } from "./word-counter.js";
// new-tool:imports

export const toolSeeds: ToolSeed[] = [
  compressImageSeed,
  convertImageSeed,
  pixelateImageSeed,
  resizeImageSeed,
  mergePdfSeed,
  splitPdfSeed,
  passwordGeneratorSeed,
  usernameGeneratorSeed,
  qrCodeGeneratorSeed,
  wordCounterSeed,
  // new-tool:entries
];
