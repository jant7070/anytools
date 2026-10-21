import { DEFAULT_LOCALE, LOCALES } from "@anytools/shared";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Every URL carries its locale (/es, /en). Only unprefixed URLs such as `/` are redirected,
  // using the Accept-Language header; no cookie overrides it.
  localePrefix: "always",
  localeDetection: true,
  localeCookie: false,
});
