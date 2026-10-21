import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * True when the module was started directly (`node migrate.js`). Compares real paths because
 * pnpm installs workspace packages behind symlinks (e.g. inside Docker images).
 */
export function isEntrypoint(moduleUrl: string): boolean {
  const script = process.argv[1];
  if (!script) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(script);
  } catch {
    return false;
  }
}
