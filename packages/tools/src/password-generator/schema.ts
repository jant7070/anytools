import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MAX_COUNT = 10;

export const passwordGeneratorInput = z
  .object({
    length: z.number().int().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).default(16),
    lowercase: z.boolean().default(true),
    uppercase: z.boolean().default(true),
    digits: z.boolean().default(true),
    symbols: z.boolean().default(false),
    excludeAmbiguous: z.boolean().default(false),
    count: z.number().int().min(1).max(PASSWORD_MAX_COUNT).default(1),
  })
  .refine((v) => v.lowercase || v.uppercase || v.digits || v.symbols, {
    message: "Select at least one character type",
    path: ["lowercase"],
  })
  .refine(
    (v) => v.length >= [v.lowercase, v.uppercase, v.digits, v.symbols].filter(Boolean).length,
    { message: "Length must be at least the number of selected character types", path: ["length"] },
  );

export const passwordGeneratorOutput = z.object({
  passwords: z.array(z.string()).min(1),
  entropyBits: z.number().nonnegative(),
});

export type PasswordGeneratorInput = z.input<typeof passwordGeneratorInput>;
export type PasswordGeneratorOutput = z.output<typeof passwordGeneratorOutput>;
