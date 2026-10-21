CREATE TYPE "public"."tool_run_mode" AS ENUM('sync', 'queue');--> statement-breakpoint
CREATE TYPE "public"."tool_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."unlock_status" AS ENUM('pending', 'verified', 'expired');--> statement-breakpoint
CREATE TABLE "audience_translations" (
	"audience_id" integer NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "audience_translations_audience_id_locale_pk" PRIMARY KEY("audience_id","locale")
);
--> statement-breakpoint
CREATE TABLE "audiences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audiences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "audiences_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(64) NOT NULL,
	"icon" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_translations" (
	"category_id" integer NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"visitor_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"tool_id" integer,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"country" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_id_created_at_pk" PRIMARY KEY("id","created_at")
);
--> statement-breakpoint
CREATE TABLE "tool_audiences" (
	"tool_id" integer NOT NULL,
	"audience_id" integer NOT NULL,
	CONSTRAINT "tool_audiences_tool_id_audience_id_pk" PRIMARY KEY("tool_id","audience_id")
);
--> statement-breakpoint
CREATE TABLE "tool_translations" (
	"tool_id" integer NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	CONSTRAINT "tool_translations_tool_id_locale_pk" PRIMARY KEY("tool_id","locale")
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tools_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(64) NOT NULL,
	"category_id" integer NOT NULL,
	"run_mode" "tool_run_mode" NOT NULL,
	"status" "tool_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "unlock_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" integer NOT NULL,
	"visitor_id" uuid NOT NULL,
	"ad_provider" varchar(32) NOT NULL,
	"status" "unlock_status" DEFAULT 'pending' NOT NULL,
	"ip_hash" varchar(64),
	"country" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"provider_tx_id" varchar(128),
	CONSTRAINT "unlock_sessions_provider_tx_id_unique" UNIQUE("provider_tx_id")
);
--> statement-breakpoint
ALTER TABLE "audience_translations" ADD CONSTRAINT "audience_translations_audience_id_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audiences" ADD CONSTRAINT "tool_audiences_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audiences" ADD CONSTRAINT "tool_audiences_audience_id_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_translations" ADD CONSTRAINT "tool_translations_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_sessions" ADD CONSTRAINT "unlock_sessions_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_type_created_idx" ON "events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "events_tool_created_idx" ON "events" USING btree ("tool_id","created_at");--> statement-breakpoint
CREATE INDEX "tool_audiences_audience_idx" ON "tool_audiences" USING btree ("audience_id");--> statement-breakpoint
CREATE INDEX "tools_category_idx" ON "tools" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "tools_status_idx" ON "tools" USING btree ("status");--> statement-breakpoint
CREATE INDEX "unlock_sessions_visitor_created_idx" ON "unlock_sessions" USING btree ("visitor_id","created_at");