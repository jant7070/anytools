import type { Locale } from "@anytools/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { cache } from "react";
import { CategoryIcon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { ToolRunner } from "@/components/tool/tool-runner";
import { Link } from "@/i18n/navigation";
import { getTool } from "@/lib/api-server";
import { alternatesFor } from "@/lib/seo";

// Deduplicate the catalog request between generateMetadata and the page.
const loadTool = cache(getTool);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tools/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await rootParams.locale()) as Locale;
  const tool = await loadTool(slug, locale);
  if (!tool) return {};
  return {
    title: tool.seoTitle,
    description: tool.seoDescription,
    alternates: alternatesFor(locale, `/tools/${slug}`),
    openGraph: { title: tool.seoTitle, description: tool.seoDescription, locale },
    // Drafts are only visible when SHOW_DRAFT_TOOLS is on: keep them out of search engines.
    robots: tool.status === "draft" ? { index: false, follow: false } : undefined,
  };
}

export default async function ToolPage({ params }: PageProps<"/[locale]/tools/[slug]">) {
  const { slug } = await params;
  const locale = (await rootParams.locale()) as Locale;
  const [tool, t, tNav] = await Promise.all([
    loadTool(slug, locale),
    getTranslations("tool"),
    getTranslations("nav"),
  ]);
  if (!tool) notFound();

  return (
    <article className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-brand-600">
              {tNav("home")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="flex items-center gap-1">
            <CategoryIcon name={tool.category.icon} /> {tool.category.name}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{tool.name}</h1>
          {tool.status === "draft" && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {t("draft")}
            </span>
          )}
        </div>
        <p className="text-lg text-slate-600 dark:text-slate-400">{tool.shortDescription}</p>
        {tool.audiences.length > 0 && (
          <p className="text-sm text-slate-500">
            {t("forAudiences")}: {tool.audiences.map((a) => a.name).join(", ")}
          </p>
        )}
      </header>

      <ToolRunner slug={tool.slug} name={tool.name} runMode={tool.runMode} />

      {tool.contentMd && (
        <section aria-labelledby="about-title" className="max-w-3xl">
          <h2 id="about-title" className="sr-only">
            {t("about")}
          </h2>
          <Markdown>{tool.contentMd}</Markdown>
        </section>
      )}
    </article>
  );
}
