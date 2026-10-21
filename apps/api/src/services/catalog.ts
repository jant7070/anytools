import {
  audiences,
  audienceTranslations,
  categories,
  categoryTranslations,
  type Database,
  toolAudiences,
  tools,
  toolTranslations,
} from "@anytools/db";
import {
  type Audience,
  type Category,
  DEFAULT_LOCALE,
  type HomeResponse,
  type Locale,
  type ToolDetail,
  type ToolRunMode,
  type ToolSummary,
} from "@anytools/shared";
import { and, asc, eq, inArray } from "drizzle-orm";

interface CatalogTool extends ToolDetail {
  id: number;
  sortOrder: number;
}

interface CatalogSnapshot {
  tools: CatalogTool[];
  categories: (Category & { id: number })[];
  audiences: (Audience & { id: number })[];
}

export interface VisibleTool {
  id: number;
  slug: string;
  runMode: ToolRunMode;
}

const SECTION_LIMIT = 8;

function pickTranslation<T extends { locale: string }>(rows: T[], locale: Locale): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function toSummary(tool: CatalogTool): ToolSummary {
  return {
    slug: tool.slug,
    categorySlug: tool.categorySlug,
    runMode: tool.runMode,
    status: tool.status,
    featured: tool.featured,
    name: tool.name,
    shortDescription: tool.shortDescription,
    audienceSlugs: tool.audienceSlugs,
    createdAt: tool.createdAt,
  };
}

/**
 * Read model for the public catalog. The whole catalog is small, so it is loaded per locale and
 * cached briefly in memory (a per-replica cache, not shared state).
 */
export class CatalogService {
  private readonly cache = new Map<Locale, { at: number; data: Promise<CatalogSnapshot> }>();

  constructor(
    private readonly db: Database,
    private readonly options: { showDrafts: boolean; cacheTtlMs: number },
  ) {}

  private visibility() {
    return this.options.showDrafts ? undefined : eq(tools.status, "published");
  }

  /** Visible tool by slug, read straight from the database (used by unlock and run). */
  async findVisibleTool(slug: string): Promise<VisibleTool | null> {
    const [row] = await this.db
      .select({ id: tools.id, slug: tools.slug, runMode: tools.runMode })
      .from(tools)
      .where(and(eq(tools.slug, slug), this.visibility()))
      .limit(1);
    return row ?? null;
  }

  async toolIdsBySlug(slugs: string[]): Promise<Map<string, number>> {
    if (slugs.length === 0) return new Map();
    const rows = await this.db
      .select({ id: tools.id, slug: tools.slug })
      .from(tools)
      .where(inArray(tools.slug, slugs));
    return new Map(rows.map((r) => [r.slug, r.id]));
  }

  async listTools(locale: Locale): Promise<ToolSummary[]> {
    return (await this.snapshot(locale)).tools.map(toSummary);
  }

  async getTool(slug: string, locale: Locale): Promise<ToolDetail | null> {
    const tool = (await this.snapshot(locale)).tools.find((t) => t.slug === slug);
    if (!tool) return null;
    const { id: _id, sortOrder: _sortOrder, ...detail } = tool;
    return detail;
  }

  async home(locale: Locale, popularSlugs: string[]): Promise<HomeResponse> {
    const snapshot = await this.snapshot(locale);
    const summaries = snapshot.tools.map(toSummary);
    const bySlug = new Map(summaries.map((t) => [t.slug, t]));
    const strip = <T extends { id: number }>({ id: _id, ...rest }: T) => rest;
    return {
      featured: summaries.filter((t) => t.featured).slice(0, SECTION_LIMIT),
      popular: popularSlugs.flatMap((slug) => bySlug.get(slug) ?? []).slice(0, SECTION_LIMIT),
      newest: [...summaries]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, SECTION_LIMIT),
      categories: snapshot.categories
        .map((c) => ({ ...strip(c), tools: summaries.filter((t) => t.categorySlug === c.slug) }))
        .filter((c) => c.tools.length > 0),
      audiences: snapshot.audiences
        .map((a) => ({
          ...strip(a),
          tools: summaries.filter((t) => t.audienceSlugs.includes(a.slug)),
        }))
        .filter((a) => a.tools.length > 0),
    };
  }

  private snapshot(locale: Locale): Promise<CatalogSnapshot> {
    const cached = this.cache.get(locale);
    if (cached && Date.now() - cached.at < this.options.cacheTtlMs) return cached.data;
    const data = this.load(locale);
    this.cache.set(locale, { at: Date.now(), data });
    data.catch(() => this.cache.delete(locale));
    return data;
  }

  private async load(locale: Locale): Promise<CatalogSnapshot> {
    const locales = [...new Set([locale, DEFAULT_LOCALE])];
    const [toolRows, toolTr, categoryRows, categoryTr, audienceRows, audienceTr, links] =
      await Promise.all([
        this.db
          .select()
          .from(tools)
          .where(this.visibility())
          .orderBy(asc(tools.sortOrder), asc(tools.id)),
        this.db.select().from(toolTranslations).where(inArray(toolTranslations.locale, locales)),
        this.db.select().from(categories).orderBy(asc(categories.sortOrder)),
        this.db
          .select()
          .from(categoryTranslations)
          .where(inArray(categoryTranslations.locale, locales)),
        this.db.select().from(audiences).orderBy(asc(audiences.sortOrder)),
        this.db
          .select()
          .from(audienceTranslations)
          .where(inArray(audienceTranslations.locale, locales)),
        this.db.select().from(toolAudiences),
      ]);

    const toolTrById = groupBy(toolTr, (r) => r.toolId);
    const categoryTrById = groupBy(categoryTr, (r) => r.categoryId);
    const audienceTrById = groupBy(audienceTr, (r) => r.audienceId);
    const linksByTool = groupBy(links, (r) => r.toolId);

    const categoryList = categoryRows.map((c) => {
      const t = pickTranslation(categoryTrById.get(c.id) ?? [], locale);
      return {
        id: c.id,
        slug: c.slug,
        icon: c.icon,
        name: t?.name ?? c.slug,
        description: t?.description ?? "",
      };
    });
    const audienceList = audienceRows.map((a) => {
      const t = pickTranslation(audienceTrById.get(a.id) ?? [], locale);
      return { id: a.id, slug: a.slug, name: t?.name ?? a.slug, description: t?.description ?? "" };
    });
    const categoryById = new Map(categoryList.map((c) => [c.id, c]));
    const audienceById = new Map(audienceList.map((a) => [a.id, a]));

    const toolList = toolRows.flatMap((tool): CatalogTool[] => {
      const category = categoryById.get(tool.categoryId);
      if (!category) return [];
      const t = pickTranslation(toolTrById.get(tool.id) ?? [], locale);
      const toolAudienceList = (linksByTool.get(tool.id) ?? []).flatMap(
        (l) => audienceById.get(l.audienceId) ?? [],
      );
      const { id: _categoryId, ...publicCategory } = category;
      return [
        {
          id: tool.id,
          sortOrder: tool.sortOrder,
          slug: tool.slug,
          categorySlug: category.slug,
          runMode: tool.runMode,
          status: tool.status,
          featured: tool.featured,
          // Tools scaffolded by `new-tool` start with empty translations: fall back to the slug.
          name: t?.name || tool.slug,
          shortDescription: t?.shortDescription ?? "",
          seoTitle: t?.seoTitle || t?.name || tool.slug,
          seoDescription: t?.seoDescription || t?.shortDescription || "",
          contentMd: t?.contentMd ?? "",
          audienceSlugs: toolAudienceList.map((a) => a.slug),
          audiences: toolAudienceList.map(({ id: _id, ...a }) => a),
          category: publicCategory,
          createdAt: tool.createdAt.toISOString(),
          updatedAt: tool.updatedAt.toISOString(),
        },
      ];
    });

    return { tools: toolList, categories: categoryList, audiences: audienceList };
  }
}
