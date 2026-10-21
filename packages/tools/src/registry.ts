// Central list of implemented tools. `pnpm new-tool <slug>` adds entries at the markers below.
import { createToolRegistry } from "./create-registry.js";
import type { AnyToolDefinition } from "./define-tool.js";
import { passwordGenerator } from "./password-generator/index.js";
import { pixelateImage } from "./pixelate-image/index.js";
// new-tool:imports

export const toolDefinitions: AnyToolDefinition[] = [
  passwordGenerator,
  pixelateImage,
  // new-tool:entries
];

export const toolRegistry = createToolRegistry(toolDefinitions);
