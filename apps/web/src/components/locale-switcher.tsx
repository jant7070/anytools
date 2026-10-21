"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher({ label, switchTo }: { label: string; switchTo: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "es" ? "en" : "es";
  return (
    <nav aria-label={label}>
      <Link
        href={pathname}
        locale={other}
        hrefLang={other}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        {switchTo}
      </Link>
    </nav>
  );
}
