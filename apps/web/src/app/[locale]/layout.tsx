import "../globals.css";
import type { Locale } from "@anytools/shared";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { connection } from "next/server";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { getPublicConfig, siteUrl } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${t("name")} — ${t("tagline")}`, template: `%s · ${t("name")}` },
    description: t("description"),
    applicationName: t("name"),
    openGraph: { siteName: t("name"), type: "website" },
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  // Render per request: runtime env (site URL, keys) and live catalog data, never build-time values.
  await connection();
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations("nav");

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Providers config={getPublicConfig()} locale={locale as Locale}>
            <SiteHeader />
            <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
              {children}
            </main>
            <SiteFooter />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
