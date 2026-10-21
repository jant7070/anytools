import {
  LOCALES,
  SLUG_PATTERN,
  TOOL_RUN_MODES,
  TOOL_STATUSES,
  UNLOCK_STATUSES,
} from "@anytools/shared";
import { describe, expect, it } from "vitest";
import { toolRunModeEnum, toolStatusEnum, unlockStatusEnum } from "../schema.js";
import { audienceSeeds } from "./audiences.js";
import { categorySeeds } from "./categories.js";
import { toolSeeds } from "./tools/index.js";

const unique = (values: string[]) => new Set(values).size === values.length;

describe("seed data", () => {
  it("has unique, well-formed slugs", () => {
    for (const list of [categorySeeds, audienceSeeds, toolSeeds]) {
      const slugs = list.map((item) => item.slug);
      expect(unique(slugs)).toBe(true);
      for (const slug of slugs) expect(slug).toMatch(SLUG_PATTERN);
    }
  });

  it("only references existing categories and audiences", () => {
    const categories = new Set(categorySeeds.map((c) => c.slug));
    const audiences = new Set(audienceSeeds.map((a) => a.slug));
    for (const tool of toolSeeds) {
      expect(categories.has(tool.category), `${tool.slug} category`).toBe(true);
      for (const a of tool.audiences) expect(audiences.has(a), `${tool.slug} → ${a}`).toBe(true);
    }
  });

  it("has a translation for every locale", () => {
    for (const item of [...categorySeeds, ...audienceSeeds, ...toolSeeds]) {
      for (const locale of LOCALES) expect(item.translations[locale]).toBeDefined();
    }
  });

  it("keeps database enums in sync with @anytools/shared", () => {
    expect(toolRunModeEnum.enumValues).toEqual([...TOOL_RUN_MODES]);
    expect(toolStatusEnum.enumValues).toEqual([...TOOL_STATUSES]);
    expect(unlockStatusEnum.enumValues).toEqual([...UNLOCK_STATUSES]);
  });
});
