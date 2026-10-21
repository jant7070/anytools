// Scaffolds a new tool end to end:
//   pnpm new-tool <slug> [--mode sync|queue] [--category <category-slug>]
//
// Creates the logic (packages/tools), a base test, the UI (apps/web) and the seed row with empty
// translations (packages/db), and registers each one at the `new-tool:` markers.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("..", import.meta.url));
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: "string", default: "sync" },
    category: { type: "string", default: "generators" },
  },
});

function fail(message: string): never {
  console.error(
    `\n✗ ${message}\n\nUsage: pnpm new-tool <slug> [--mode sync|queue] [--category <slug>]\n`,
  );
  process.exit(1);
}

const slug = positionals[0];
if (!slug || !SLUG.test(slug))
  fail("Provide a kebab-case slug, e.g. `pnpm new-tool json-formatter`.");
const mode = values.mode;
if (mode !== "sync" && mode !== "queue") fail("--mode must be `sync` or `queue`.");
const category = values.category ?? "generators";
if (!SLUG.test(category))
  fail("--category must be a category slug (see packages/db/src/seed-data/categories.ts).");

const camel = slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const pascal = camel[0]!.toUpperCase() + camel.slice(1);

const paths = {
  logicDir: join(root, "packages/tools/src", slug),
  toolRegistry: join(root, "packages/tools/src/registry.ts"),
  uiDir: join(root, "apps/web/src/tools", slug),
  uiRegistry: join(root, "apps/web/src/tools/registry.ts"),
  seedFile: join(root, "packages/db/src/seed-data/tools", `${slug}.ts`),
  seedIndex: join(root, "packages/db/src/seed-data/tools/index.ts"),
  categories: join(root, "packages/db/src/seed-data/categories.ts"),
};

if (existsSync(paths.logicDir)) fail(`packages/tools/src/${slug} already exists.`);
if (existsSync(paths.uiDir)) fail(`apps/web/src/tools/${slug} already exists.`);
if (!readFileSync(paths.categories, "utf8").includes(`slug: "${category}"`))
  fail(`Unknown category "${category}".`);

const created: string[] = [];
const updated: string[] = [];

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  created.push(relative(root, path));
}

/** Inserts `line` right before the `// new-tool:<marker>` comment, keeping its indentation. */
function insertAtMarker(path: string, marker: string, line: string) {
  const source = readFileSync(path, "utf8");
  const match = new RegExp(`^([ \\t]*)// new-tool:${marker}$`, "m").exec(source);
  if (!match) fail(`Marker "// new-tool:${marker}" not found in ${relative(root, path)}.`);
  const indent = match[1] ?? "";
  writeFileSync(path, source.replace(match[0], `${indent}${line}\n${match[0]}`));
  if (!updated.includes(relative(root, path))) updated.push(relative(root, path));
}

// --- Logic (packages/tools) -------------------------------------------------------------------

const schemaSync = `import { z } from "zod";

export const ${camel}Input = z.object({
  text: z.string().min(1).max(10_000),
});

export const ${camel}Output = z.object({
  result: z.string(),
});

export type ${pascal}Input = z.input<typeof ${camel}Input>;
export type ${pascal}Output = z.output<typeof ${camel}Output>;
`;

const schemaQueue = `import { z } from "zod";

export const ${camel}AcceptedTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export const ${camel}MaxFileBytes = 10 * 1024 * 1024;

export const ${camel}Input = z.object({});

export const ${camel}Output = z.object({
  bytes: z.number().int().nonnegative(),
});

export type ${pascal}Input = z.input<typeof ${camel}Input>;
export type ${pascal}Output = z.output<typeof ${camel}Output>;
`;

const logicSync = `import { defineTool } from "../define-tool.js";
import { ${camel}Input, ${camel}Output } from "./schema.js";

export const ${camel} = defineTool({
  slug: "${slug}",
  runMode: "sync",
  input: ${camel}Input,
  output: ${camel}Output,
  limits: { maxInputBytes: 16 * 1024, timeoutMs: 5_000 },
  handler: async (input) => {
    // TODO: implement the tool. Throw ToolInputError for user-facing validation problems.
    return { result: input.text };
  },
});
`;

const logicQueue = `import { defineTool } from "../define-tool.js";
import { ToolInputError } from "../errors.js";
import { ${camel}AcceptedTypes, ${camel}Input, ${camel}MaxFileBytes, ${camel}Output } from "./schema.js";

export const ${camel} = defineTool({
  slug: "${slug}",
  runMode: "queue",
  input: ${camel}Input,
  output: ${camel}Output,
  files: { accept: ${camel}AcceptedTypes, minFiles: 1, maxFiles: 1 },
  limits: { maxInputBytes: ${camel}MaxFileBytes, timeoutMs: 30_000 },
  handler: async (_input, ctx) => {
    const file = ctx.files[0];
    if (!file) throw new ToolInputError("A file is required");
    // TODO: implement the tool. This template returns the uploaded file unchanged.
    ctx.signal.throwIfAborted();
    await ctx.saveFile({ data: file.data, filename: file.filename, contentType: file.contentType });
    return { bytes: file.size };
  },
});
`;

const testSync = `import { describe, expect, it } from "vitest";
import { executeTool } from "../execute.js";
import { createTestOptions } from "../test-utils/context.js";
import { ${camel} } from "./index.js";

describe("${slug}", () => {
  it("runs with valid input", async () => {
    const { options } = createTestOptions();
    await expect(executeTool(${camel}, { text: "hello" }, options)).resolves.toEqual({ result: "hello" });
  });

  it("rejects invalid input", async () => {
    const { options } = createTestOptions();
    await expect(executeTool(${camel}, { text: "" }, options)).rejects.toThrow();
  });
});
`;

const testQueue = `import { describe, expect, it } from "vitest";
import { executeTool } from "../execute.js";
import { createTestOptions } from "../test-utils/context.js";
import { ${camel} } from "./index.js";

describe("${slug}", () => {
  it("processes an uploaded file", async () => {
    const data = Buffer.from("fake image bytes");
    const { options, saved } = createTestOptions([{ filename: "a.png", contentType: "image/png", size: data.length, data }]);
    await expect(executeTool(${camel}, {}, options)).resolves.toEqual({ bytes: data.length });
    expect(saved).toHaveLength(1);
  });

  it("requires a file", async () => {
    await expect(executeTool(${camel}, {}, createTestOptions([]).options)).rejects.toThrow();
  });
});
`;

write(join(paths.logicDir, "schema.ts"), mode === "sync" ? schemaSync : schemaQueue);
write(join(paths.logicDir, "index.ts"), mode === "sync" ? logicSync : logicQueue);
write(join(paths.logicDir, `${slug}.test.ts`), mode === "sync" ? testSync : testQueue);
insertAtMarker(paths.toolRegistry, "imports", `import { ${camel} } from "./${slug}/index.js";`);
insertAtMarker(paths.toolRegistry, "entries", `${camel},`);

// --- UI (apps/web) ----------------------------------------------------------------------------

const uiSync = `"use client";

import type { ${pascal}Output } from "@anytools/tools/schemas/${slug}";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Spinner } from "@/components/icons";
import { type ToolUIProps, UnlockCancelledError } from "../types";

export default function ${pascal}UI({ run }: ToolUIProps) {
  const t = useTranslations("tool");
  const id = useId();
  const [text, setText] = useState("");
  const [result, setResult] = useState<${pascal}Output | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { output } = await run<${pascal}Output>({ input: { text } });
      setResult(output);
    } catch (err) {
      if (!(err instanceof UnlockCancelledError)) setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor={id} className="label">
        {t("input")}
      </label>
      <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={5} className="input" required />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy || !text}>
        {busy && <Spinner />}
        {t("run")}
      </button>
      {result && (
        <output className="block space-y-1" aria-live="polite">
          <span className="label">{t("result")}</span>
          <pre className="rounded-lg bg-slate-100 p-3 text-sm whitespace-pre-wrap dark:bg-slate-800">{result.result}</pre>
        </output>
      )}
    </form>
  );
}
`;

const uiQueue = `"use client";

import type { DownloadableFile } from "@anytools/shared";
import { ${camel}AcceptedTypes } from "@anytools/tools/schemas/${slug}";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { DownloadIcon, Spinner } from "@/components/icons";
import { type ToolRunPhase, type ToolUIProps, UnlockCancelledError } from "../types";

export default function ${pascal}UI({ run }: ToolUIProps) {
  const t = useTranslations("tool");
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<ToolRunPhase | null>(null);
  const [result, setResult] = useState<DownloadableFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const { files } = await run({ input: {}, files: [file] }, setPhase);
      setResult(files[0] ?? null);
    } catch (err) {
      if (!(err instanceof UnlockCancelledError)) setError(t("error"));
    } finally {
      setPhase(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor={id} className="label">
        {t("file")}
      </label>
      <input id={id} type="file" accept={${camel}AcceptedTypes.join(",")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm" />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={phase !== null || !file}>
        {phase && <Spinner />}
        {phase === "queued" ? t("queued") : phase === "processing" ? t("processing") : t("run")}
      </button>
      {result && (
        <p aria-live="polite">
          <a href={result.url} download={result.filename} className="btn-primary">
            <DownloadIcon /> {t("download")}
          </a>
          <span className="mt-1 block text-xs text-slate-500">{t("expiresNote")}</span>
        </p>
      )}
    </form>
  );
}
`;

write(join(paths.uiDir, "index.tsx"), mode === "sync" ? uiSync : uiQueue);
insertAtMarker(paths.uiRegistry, "entries", `"${slug}": () => import("./${slug}"),`);

// --- Seed (packages/db) -----------------------------------------------------------------------

const emptyTranslation = `{ name: "", shortDescription: "", seoTitle: "", seoDescription: "", contentMd: "" }`;
if (existsSync(paths.seedFile)) {
  console.log(`• Seed already exists (${relative(root, paths.seedFile)}): kept as is.`);
} else {
  write(
    paths.seedFile,
    `import type { ToolSeed } from "../types.js";

// Fill in the ES/EN texts, then run \`pnpm db:seed\`. Set status to "published" when ready.
export const ${camel}Seed: ToolSeed = {
  slug: "${slug}",
  category: "${category}",
  runMode: "${mode}",
  status: "draft",
  featured: false,
  sortOrder: 100,
  audiences: [],
  translations: {
    es: ${emptyTranslation},
    en: ${emptyTranslation},
  },
};
`,
  );
  insertAtMarker(paths.seedIndex, "imports", `import { ${camel}Seed } from "./${slug}.js";`);
  insertAtMarker(paths.seedIndex, "entries", `${camel}Seed,`);
}

console.log(`\n✓ Tool "${slug}" (${mode}) scaffolded.\n`);
console.log("Created:");
for (const file of created) console.log(`  + ${file}`);
console.log("Updated:");
for (const file of updated) console.log(`  ~ ${file}`);
console.log(`
Next steps:
  1. Implement the handler in packages/tools/src/${slug}/index.ts (and its schema/test).
  2. Build the UI in apps/web/src/tools/${slug}/index.tsx.
  3. Fill the ES/EN texts in packages/db/src/seed-data/tools/${slug}.ts, then: pnpm db:seed
  4. pnpm test && pnpm typecheck && pnpm lint
`);
