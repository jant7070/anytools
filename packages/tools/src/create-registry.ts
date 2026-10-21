import type { AnyToolDefinition } from "./define-tool.js";

export interface ToolRegistry {
  get(slug: string): AnyToolDefinition | undefined;
  has(slug: string): boolean;
  list(): AnyToolDefinition[];
}

export function createToolRegistry(definitions: readonly AnyToolDefinition[]): ToolRegistry {
  const bySlug = new Map<string, AnyToolDefinition>();
  for (const definition of definitions) {
    if (bySlug.has(definition.slug)) {
      throw new Error(`Duplicate tool slug in registry: ${definition.slug}`);
    }
    bySlug.set(definition.slug, definition);
  }
  return {
    get: (slug) => bySlug.get(slug),
    has: (slug) => bySlug.has(slug),
    list: () => [...bySlug.values()],
  };
}
