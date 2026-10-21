// Copies every `.env.example` in apps/* and packages/* to `.env` when it does not exist yet,
// so `pnpm install && pnpm dev` works out of the box. Existing `.env` files are never touched.
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.CI) process.exit(0);

const root = fileURLToPath(new URL("..", import.meta.url));

for (const group of ["apps", "packages"]) {
  const groupDir = join(root, group);
  if (!existsSync(groupDir)) continue;
  for (const name of readdirSync(groupDir)) {
    const example = join(groupDir, name, ".env.example");
    const target = join(groupDir, name, ".env");
    if (existsSync(example) && !existsSync(target)) {
      copyFileSync(example, target);
      console.log(`[setup-env] created ${group}/${name}/.env from .env.example`);
    }
  }
}
