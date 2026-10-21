import type { ToolSummary } from "@anytools/shared";
import { describe, expect, it } from "vitest";
import { normalize, searchTools } from "./search";

const tool = (slug: string, name: string, shortDescription = ""): ToolSummary => ({
  slug,
  name,
  shortDescription,
  categorySlug: "x",
  runMode: "sync",
  status: "published",
  featured: false,
  audienceSlugs: [],
  createdAt: new Date().toISOString(),
});

const tools = [
  tool("password-generator", "Generador de contraseñas", "Contraseñas fuertes"),
  tool("merge-pdf", "Unir PDF", "Combina varios PDF"),
];

describe("searchTools", () => {
  it("ignores accents and case", () => {
    expect(normalize("ContraSEÑA")).toBe("contrasena");
    expect(searchTools(tools, "contrasena").map((t) => t.slug)).toEqual(["password-generator"]);
  });

  it("requires every word and matches slugs", () => {
    expect(searchTools(tools, "unir pdf")).toHaveLength(1);
    expect(searchTools(tools, "unir imagen")).toHaveLength(0);
    expect(searchTools(tools, "password")).toHaveLength(1);
  });

  it("returns nothing for an empty query", () => {
    expect(searchTools(tools, "   ")).toEqual([]);
  });
});
