import { DEFAULT_LOCALE, LOCALES, type Locale } from "@anytools/shared";
import { siteUrl } from "./env";

/** Absolute URL of a localized path, e.g. localizedUrl("es", "/tools/x") → https://…/es/tools/x */
export function localizedUrl(locale: Locale, path = ""): string {
  return siteUrl(`/${locale}${path}`);
}

/** Canonical + hreflang alternates (including x-default) for a localized page. */
export function alternatesFor(
  locale: Locale,
  path = "",
): { canonical: string; languages: Record<Locale | "x-default", string> } {
  const languages = Object.fromEntries(LOCALES.map((l) => [l, localizedUrl(l, path)])) as Record<
    Locale,
    string
  >;
  return {
    canonical: localizedUrl(locale, path),
    languages: { ...languages, "x-default": localizedUrl(DEFAULT_LOCALE, path) },
  };
}
