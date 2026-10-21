import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-sm text-slate-600 dark:text-slate-400">
        <p>{t("adsNote")}</p>
        <p>{t("privacy")}</p>
        <p>{t("copyright", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
