import { randomInt } from "node:crypto";
import { defineTool } from "../define-tool.js";
import { passwordGeneratorInput, passwordGeneratorOutput } from "./schema.js";

const SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>/?~",
} as const;

/** Characters that are easy to confuse when read or typed by hand. */
const AMBIGUOUS = new Set("Il1O0o|");

function pick(pool: string): string {
  return pool[randomInt(pool.length)] as string;
}

/** Fisher–Yates shuffle driven by a CSPRNG. */
function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  return chars;
}

export const passwordGenerator = defineTool({
  slug: "password-generator",
  runMode: "sync",
  input: passwordGeneratorInput,
  output: passwordGeneratorOutput,
  limits: { maxInputBytes: 1024, timeoutMs: 2000 },
  handler: async (input) => {
    const pools = (Object.keys(SETS) as (keyof typeof SETS)[])
      .filter((name) => input[name])
      .map((name) =>
        input.excludeAmbiguous
          ? [...SETS[name]].filter((c) => !AMBIGUOUS.has(c)).join("")
          : SETS[name],
      );
    const combined = pools.join("");

    const passwords = Array.from({ length: input.count }, () => {
      // Guarantee one character from every selected set, then fill from the combined pool.
      const chars = pools.map(pick);
      while (chars.length < input.length) chars.push(pick(combined));
      return shuffle(chars).join("");
    });

    const entropyBits = Math.round(input.length * Math.log2(combined.length) * 10) / 10;
    return { passwords, entropyBits };
  },
});
