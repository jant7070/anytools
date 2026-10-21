import {
  homeResponseSchema,
  type HomeResponse,
  type Locale,
  toolDetailSchema,
  type ToolDetail,
  toolListResponseSchema,
  type ToolSummary,
} from "@anytools/shared";
import type { z } from "zod";
import { getEnv } from "./env";

/** Catalog data changes rarely; cache API responses briefly in the Next.js data cache. */
const REVALIDATE_SECONDS = 60;

async function fetchCatalog<T extends z.ZodType>(
  path: string,
  schema: T,
): Promise<z.output<T> | null> {
  const res = await fetch(`${getEnv().API_INTERNAL_URL}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["catalog"] },
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} responded ${res.status}`);
  return schema.parse(await res.json());
}

export async function getHome(locale: Locale): Promise<HomeResponse> {
  const home = await fetchCatalog(`/api/catalog/home?locale=${locale}`, homeResponseSchema);
  if (!home) throw new Error("Home catalog not found");
  return home;
}

export async function getToolList(locale: Locale): Promise<ToolSummary[]> {
  return (
    (await fetchCatalog(`/api/catalog/tools?locale=${locale}`, toolListResponseSchema))?.tools ?? []
  );
}

export function getTool(slug: string, locale: Locale): Promise<ToolDetail | null> {
  return fetchCatalog(
    `/api/catalog/tools/${encodeURIComponent(slug)}?locale=${locale}`,
    toolDetailSchema,
  );
}
