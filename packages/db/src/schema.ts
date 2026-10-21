// Database schema. Kept free of relative/workspace imports so drizzle-kit can load it standalone;
// enum values are asserted to match @anytools/shared in schema.test.ts.
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const locale = () => varchar("locale", { length: 8 }).notNull();

export const toolRunModeEnum = pgEnum("tool_run_mode", ["sync", "queue"]);
export const toolStatusEnum = pgEnum("tool_status", ["draft", "published"]);
export const unlockStatusEnum = pgEnum("unlock_status", ["pending", "verified", "expired"]);

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  icon: varchar("icon", { length: 64 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const categoryTranslations = pgTable(
  "category_translations",
  {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    locale: locale(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.locale] })],
);

export const audiences = pgTable("audiences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const audienceTranslations = pgTable(
  "audience_translations",
  {
    audienceId: integer("audience_id")
      .notNull()
      .references(() => audiences.id, { onDelete: "cascade" }),
    locale: locale(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.audienceId, t.locale] })],
);

export const tools = pgTable(
  "tools",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    runMode: toolRunModeEnum("run_mode").notNull(),
    status: toolStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("tools_category_idx").on(t.categoryId), index("tools_status_idx").on(t.status)],
);

export const toolTranslations = pgTable(
  "tool_translations",
  {
    toolId: integer("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    locale: locale(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    contentMd: text("content_md").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.toolId, t.locale] })],
);

export const toolAudiences = pgTable(
  "tool_audiences",
  {
    toolId: integer("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    audienceId: integer("audience_id")
      .notNull()
      .references(() => audiences.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.toolId, t.audienceId] }),
    index("tool_audiences_audience_idx").on(t.audienceId),
  ],
);

// ---------------------------------------------------------------------------
// Ad unlock sessions
// ---------------------------------------------------------------------------

// Identity is the anonymous `visitor_id` for now. When accounts arrive, add a nullable
// `user_id` column (and index) — every query filters through visitor_id today, so the change
// is purely additive.
export const unlockSessions = pgTable(
  "unlock_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toolId: integer("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id").notNull(),
    adProvider: varchar("ad_provider", { length: 32 }).notNull(),
    status: unlockStatusEnum("status").notNull().default("pending"),
    ipHash: varchar("ip_hash", { length: 64 }),
    country: char("country", { length: 2 }),
    createdAt: createdAt(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    // Provider transaction id (e.g. AppLixir `tid`). Unique so webhook retries are idempotent;
    // Postgres allows many NULLs under a unique constraint.
    providerTxId: varchar("provider_tx_id", { length: 128 }).unique(),
  },
  (t) => [index("unlock_sessions_visitor_created_idx").on(t.visitorId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Analytics events
// ---------------------------------------------------------------------------

// Ready for monthly range partitioning on `created_at`: the primary key already includes the
// partition key and nothing references this table. To partition later, create a partitioned
// copy (`PARTITION BY RANGE (created_at)`), attach monthly partitions and swap the tables.
export const events = pgTable(
  "events",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity(),
    visitorId: uuid("visitor_id").notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    toolId: integer("tool_id").references(() => tools.id, { onDelete: "set null" }),
    props: jsonb("props")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    country: char("country", { length: 2 }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.createdAt] }),
    index("events_type_created_idx").on(t.type, t.createdAt),
    index("events_tool_created_idx").on(t.toolId, t.createdAt),
  ],
);

export type Category = typeof categories.$inferSelect;
export type Audience = typeof audiences.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type ToolTranslation = typeof toolTranslations.$inferSelect;
export type UnlockSession = typeof unlockSessions.$inferSelect;
export type NewUnlockSession = typeof unlockSessions.$inferInsert;
export type NewEvent = typeof events.$inferInsert;
