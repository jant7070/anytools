// UI registry: tool slug → lazily loaded component. `pnpm new-tool <slug>` adds entries below.
import type { ComponentType } from "react";
import type { ToolUIProps } from "./types";

type ToolUILoader = () => Promise<{ default: ComponentType<ToolUIProps> }>;

export const toolUIs: Record<string, ToolUILoader | undefined> = {
  "password-generator": () => import("./password-generator"),
  "pixelate-image": () => import("./pixelate-image"),
  // new-tool:entries
};
