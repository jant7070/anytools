import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  let resolved = locale;
  if (!resolved) {
    const fromRoute = await rootParams.locale();
    if (!hasLocale(routing.locales, fromRoute)) notFound();
    resolved = fromRoute;
  }
  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  };
});
