import { LOCALES } from "@anytools/shared";
import { eq, sql } from "drizzle-orm";
import { createDb, type Database } from "./client.js";
import { isEntrypoint } from "./entrypoint.js";
import {
  audiences,
  audienceTranslations,
  categories,
  categoryTranslations,
  toolAudiences,
  tools,
  toolTranslations,
} from "./schema.js";
import { audienceSeeds } from "./seed-data/audiences.js";
import { categorySeeds } from "./seed-data/categories.js";
import { toolSeeds } from "./seed-data/tools/index.js";

export { audienceSeeds, categorySeeds, toolSeeds };

/**
 * Upserts the catalog (categories, audiences, tools and their translations).
 * Idempotent: the seed files are the source of truth for catalog content, so re-running it
 * overwrites names, descriptions, flags and status with the values in `seed-data/`.
 */
export async function seed(db: Database): Promise<{ tools: number }> {
  await db.transaction(async (tx) => {
    const categoryIds = new Map<string, number>();
    for (const c of categorySeeds) {
      const [row] = await tx
        .insert(categories)
        .values({ slug: c.slug, icon: c.icon, sortOrder: c.sortOrder })
        .onConflictDoUpdate({
          target: categories.slug,
          set: { icon: c.icon, sortOrder: c.sortOrder },
        })
        .returning({ id: categories.id });
      if (!row) throw new Error(`Failed to upsert category ${c.slug}`);
      categoryIds.set(c.slug, row.id);
      for (const locale of LOCALES) {
        const t = c.translations[locale];
        await tx
          .insert(categoryTranslations)
          .values({ categoryId: row.id, locale, ...t })
          .onConflictDoUpdate({
            target: [categoryTranslations.categoryId, categoryTranslations.locale],
            set: t,
          });
      }
    }

    const audienceIds = new Map<string, number>();
    for (const a of audienceSeeds) {
      const [row] = await tx
        .insert(audiences)
        .values({ slug: a.slug, sortOrder: a.sortOrder })
        .onConflictDoUpdate({ target: audiences.slug, set: { sortOrder: a.sortOrder } })
        .returning({ id: audiences.id });
      if (!row) throw new Error(`Failed to upsert audience ${a.slug}`);
      audienceIds.set(a.slug, row.id);
      for (const locale of LOCALES) {
        const t = a.translations[locale];
        await tx
          .insert(audienceTranslations)
          .values({ audienceId: row.id, locale, ...t })
          .onConflictDoUpdate({
            target: [audienceTranslations.audienceId, audienceTranslations.locale],
            set: t,
          });
      }
    }

    for (const tool of toolSeeds) {
      const categoryId = categoryIds.get(tool.category);
      if (categoryId === undefined) {
        throw new Error(`Tool ${tool.slug} references unknown category ${tool.category}`);
      }
      const values = {
        categoryId,
        runMode: tool.runMode,
        status: tool.status,
        featured: tool.featured,
        sortOrder: tool.sortOrder,
      };
      const [row] = await tx
        .insert(tools)
        .values({ slug: tool.slug, ...values })
        .onConflictDoUpdate({ target: tools.slug, set: { ...values, updatedAt: sql`now()` } })
        .returning({ id: tools.id });
      if (!row) throw new Error(`Failed to upsert tool ${tool.slug}`);

      for (const locale of LOCALES) {
        const t = tool.translations[locale];
        await tx
          .insert(toolTranslations)
          .values({ toolId: row.id, locale, ...t })
          .onConflictDoUpdate({
            target: [toolTranslations.toolId, toolTranslations.locale],
            set: t,
          });
      }

      await tx.delete(toolAudiences).where(eq(toolAudiences.toolId, row.id));
      const audienceRows = tool.audiences.map((slug) => {
        const audienceId = audienceIds.get(slug);
        if (audienceId === undefined) {
          throw new Error(`Tool ${tool.slug} references unknown audience ${slug}`);
        }
        return { toolId: row.id, audienceId };
      });
      if (audienceRows.length > 0) await tx.insert(toolAudiences).values(audienceRows);
    }
  });
  return { tools: toolSeeds.length };
}

if (isEntrypoint(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[db:seed] DATABASE_URL is not set (see packages/db/.env.example).");
    process.exit(1);
  }
  const { db, close } = createDb(url, { max: 1 });
  seed(db)
    .then(({ tools: count }) => console.log(`[db:seed] catalog seeded (${count} tools)`))
    .catch((error: unknown) => {
      console.error("[db:seed] failed:", error);
      process.exitCode = 1;
    })
    .finally(() => close());
}
