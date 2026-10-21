import { DEFAULT_LOCALE, LOCALES } from "@anytools/shared";
import type { MetadataRoute } from "next";
import { getToolList } from "@/lib/api-server";
import { alternatesFor } from "@/lib/seo";

// Built per request so it reflects the runtime SITE_URL and the live catalog.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => {
    const { languages } = alternatesFor(DEFAULT_LOCALE, path);
    return {
      url: languages[DEFAULT_LOCALE],
      lastModified,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, languages[l]])) },
    };
  };

  let tools: Awaited<ReturnType<typeof getToolList>> = [];
  try {
    tools = await getToolList(DEFAULT_LOCALE);
  } catch {
    // API unavailable: still serve the home pages.
  }

  return [
    entry(""),
    // Drafts are excluded: they are only visible in development.
    ...tools.filter((t) => t.status === "published").map((t) => entry(`/tools/${t.slug}`)),
  ];
}
