import type { ToolSummary } from "@anytools/shared";

/** Lowercase and strip accents so "contrasena" matches "contraseña". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Every query word must appear in the tool's name, description or slug. */
export function searchTools(tools: ToolSummary[], query: string): ToolSummary[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return tools.filter((tool) => {
    const haystack = normalize(
      `${tool.name} ${tool.shortDescription} ${tool.slug.replaceAll("-", " ")}`,
    );
    return words.every((word) => haystack.includes(word));
  });
}
