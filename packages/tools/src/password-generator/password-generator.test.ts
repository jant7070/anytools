import { describe, expect, it } from "vitest";
import { ToolInputError } from "../errors.js";
import { executeTool } from "../execute.js";
import { createTestOptions } from "../test-utils/context.js";
import { passwordGenerator } from "./index.js";
import type { PasswordGeneratorInput, PasswordGeneratorOutput } from "./schema.js";

async function run(input: PasswordGeneratorInput) {
  const { options } = createTestOptions();
  return (await executeTool(passwordGenerator, input, options)) as PasswordGeneratorOutput;
}

describe("password-generator", () => {
  it("uses sensible defaults", async () => {
    const result = await run({});
    expect(result.passwords).toHaveLength(1);
    expect(result.passwords[0]).toHaveLength(16);
    expect(result.entropyBits).toBeGreaterThan(80);
  });

  it("respects length and count", async () => {
    const result = await run({ length: 40, count: 5 });
    expect(result.passwords).toHaveLength(5);
    for (const p of result.passwords) expect(p).toHaveLength(40);
    expect(new Set(result.passwords).size).toBe(5);
  });

  it("includes at least one character of every selected set", async () => {
    const { passwords } = await run({ length: 4, symbols: true, count: 10 });
    for (const p of passwords) {
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("only uses selected sets and can exclude ambiguous characters", async () => {
    const digitsOnly = await run({ lowercase: false, uppercase: false, digits: true, length: 64 });
    expect(digitsOnly.passwords[0]).toMatch(/^[0-9]+$/);

    const { passwords } = await run({ length: 128, count: 10, excludeAmbiguous: true });
    for (const p of passwords) expect(p).not.toMatch(/[Il1O0o|]/);
  });

  it("rejects invalid options", async () => {
    await expect(
      run({ lowercase: false, uppercase: false, digits: false, symbols: false }),
    ).rejects.toBeInstanceOf(ToolInputError);
    await expect(run({ length: 3 })).rejects.toBeInstanceOf(ToolInputError);
    await expect(run({ length: 1000 })).rejects.toBeInstanceOf(ToolInputError);
  });
});
