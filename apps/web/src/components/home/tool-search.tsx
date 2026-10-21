"use client";

import type { ToolSummary } from "@anytools/shared";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { track } from "@/lib/analytics/tracker";
import { searchTools } from "@/lib/search";
import { SearchIcon } from "../icons";
import { ToolList } from "./tool-list";

export function ToolSearch({
  tools,
  icons,
}: {
  tools: ToolSummary[];
  icons: Record<string, string>;
}) {
  const t = useTranslations("home");
  const [query, setQuery] = useState("");
  const inputId = useId();
  const results = useMemo(() => searchTools(tools, query), [tools, query]);
  const trimmed = query.trim();

  // Record searches once the user pauses typing.
  useEffect(() => {
    if (trimmed.length < 2) return;
    const timer = setTimeout(
      () =>
        track({ type: "search", props: { query: trimmed.slice(0, 100), results: results.length } }),
      800,
    );
    return () => clearTimeout(timer);
  }, [trimmed, results.length]);

  return (
    <div role="search" className="space-y-4">
      <label htmlFor={inputId} className="sr-only">
        {t("searchLabel")}
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-slate-400" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pr-4 pl-12 text-base shadow-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      {trimmed && (
        <div aria-live="polite" className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {results.length === 0
              ? t("searchNoResults", { query: trimmed })
              : t("searchResults", { count: results.length })}
          </p>
          {results.length > 0 && <ToolList tools={results} section="search" icons={icons} />}
        </div>
      )}
    </div>
  );
}
