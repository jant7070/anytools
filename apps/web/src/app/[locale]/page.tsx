import type { Locale, ToolSummary } from "@anytools/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import * as rootParams from "next/root-params";
import { AudiencePicker } from "@/components/home/audience-picker";
import { ToolList } from "@/components/home/tool-list";
import { ToolSearch } from "@/components/home/tool-search";
import { CategoryIcon } from "@/components/icons";
import { Section } from "@/components/section";
import { getHome } from "@/lib/api-server";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations("site");
  return {
    title: { absolute: `${t("name")} — ${t("tagline")}` },
    description: t("description"),
    alternates: alternatesFor(locale),
  };
}

export default async function HomePage() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, home] = await Promise.all([getTranslations("home"), getHome(locale)]);

  const icons = Object.fromEntries(home.categories.map((c) => [c.slug, c.icon]));
  const allTools: ToolSummary[] = home.categories.flatMap((c) => c.tools);

  return (
    <div className="space-y-12">
      <div className="space-y-6 py-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto max-w-2xl text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
        <div className="mx-auto max-w-2xl text-left">
          <ToolSearch tools={allTools} icons={icons} />
        </div>
      </div>

      {allTools.length === 0 && <p className="text-center text-slate-600">{t("empty")}</p>}

      {home.featured.length > 0 && (
        <Section id="featured" title={t("featured")}>
          <ToolList tools={home.featured} section="featured" icons={icons} />
        </Section>
      )}

      {home.popular.length > 0 && (
        <Section id="popular" title={t("popular")} hint={t("popularHint")}>
          <ToolList tools={home.popular} section="popular" icons={icons} />
        </Section>
      )}

      {home.categories.length > 0 && (
        <Section id="categories" title={t("byCategory")}>
          <div className="space-y-8">
            {home.categories.map((category) => (
              <div key={category.slug} className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <CategoryIcon name={category.icon} className="text-brand-600" />
                  {category.name}
                  <span className="text-sm font-normal text-slate-500">
                    · {category.description}
                  </span>
                </h3>
                <ToolList tools={category.tools} section="category" icons={icons} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {home.audiences.length > 0 && (
        <Section id="audiences" title={t("byAudience")}>
          <AudiencePicker audiences={home.audiences} icons={icons} label={t("audienceLabel")} />
        </Section>
      )}

      {home.newest.length > 0 && (
        <Section id="newest" title={t("newest")}>
          <ToolList tools={home.newest} section="new" icons={icons} />
        </Section>
      )}
    </div>
  );
}
