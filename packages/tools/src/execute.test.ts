import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createToolRegistry } from "./create-registry.js";
import { defineTool } from "./define-tool.js";
import { ToolExecutionError, ToolInputError, ToolTimeoutError } from "./errors.js";
import { executeTool } from "./execute.js";
import { toolRegistry } from "./registry.js";
import { createTestOptions } from "./test-utils/context.js";

const echo = defineTool({
  slug: "echo",
  runMode: "sync",
  input: z.object({ text: z.string() }),
  output: z.object({ text: z.string() }),
  limits: { maxInputBytes: 100, timeoutMs: 1000 },
  handler: async ({ text }) => ({ text }),
});

describe("executeTool", () => {
  it("validates input and output", async () => {
    const { options } = createTestOptions();
    await expect(executeTool(echo, { text: "hi" }, options)).resolves.toEqual({ text: "hi" });
    await expect(executeTool(echo, { text: 1 }, options)).rejects.toBeInstanceOf(ToolInputError);

    const liar = defineTool({
      ...echo,
      slug: "liar",
      handler: async () => ({ text: 42 as never }),
    });
    await expect(executeTool(liar, { text: "x" }, options)).rejects.toBeInstanceOf(
      ToolExecutionError,
    );
  });

  it("aborts handlers that exceed the timeout", async () => {
    let aborted = false;
    const slow = defineTool({
      ...echo,
      slug: "slow",
      limits: { maxInputBytes: 100, timeoutMs: 20 },
      handler: (_input, ctx) =>
        new Promise((resolve) => {
          ctx.signal.addEventListener("abort", () => (aborted = true));
          setTimeout(() => resolve({ text: "late" }), 500);
        }),
    });
    await expect(
      executeTool(slow, { text: "x" }, createTestOptions().options),
    ).rejects.toBeInstanceOf(ToolTimeoutError);
    expect(aborted).toBe(true);
  });

  it("hides unexpected handler errors behind a generic ToolExecutionError", async () => {
    const broken = defineTool({
      ...echo,
      slug: "broken",
      handler: async () => {
        throw new Error("secret internals");
      },
    });
    const error: unknown = await executeTool(
      broken,
      { text: "x" },
      createTestOptions().options,
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ToolExecutionError);
    expect((error as Error).message).not.toContain("secret internals");
  });

  it("rejects files for tools that do not accept them", async () => {
    const file = { filename: "a.txt", contentType: "text/plain", size: 1, data: Buffer.from("a") };
    await expect(
      executeTool(echo, { text: "x" }, createTestOptions([file]).options),
    ).rejects.toBeInstanceOf(ToolInputError);
  });
});

describe("tool registry", () => {
  it("resolves the built-in tools by slug", () => {
    expect(toolRegistry.get("password-generator")?.runMode).toBe("sync");
    expect(toolRegistry.get("pixelate-image")?.runMode).toBe("queue");
    expect(toolRegistry.has("nope")).toBe(false);
  });

  it("rejects duplicate slugs and invalid definitions", () => {
    expect(() => createToolRegistry([echo, echo])).toThrow(/Duplicate/);
    expect(() => defineTool({ ...echo, slug: "Not Kebab" })).toThrow(/Invalid tool slug/);
  });
});
