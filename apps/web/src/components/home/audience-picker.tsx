"use client";

import type { HomeResponse } from "@anytools/shared";
import { useState } from "react";
import { ToolList } from "./tool-list";

export function AudiencePicker({
  audiences,
  icons,
  label,
}: {
  audiences: HomeResponse["audiences"];
  icons: Record<string, string>;
  label: string;
}) {
  const [selected, setSelected] = useState(audiences[0]?.slug);
  const current = audiences.find((a) => a.slug === selected) ?? audiences[0];
  if (!current) return null;

  return (
    <div className="space-y-4">
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {audiences.map((a) => (
          <button
            key={a.slug}
            type="button"
            aria-pressed={a.slug === current.slug}
            onClick={() => setSelected(a.slug)}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium transition hover:border-brand-500 aria-pressed:border-brand-600 aria-pressed:bg-brand-600 aria-pressed:text-white dark:border-slate-700"
          >
            {a.name}
          </button>
        ))}
      </div>
      {current.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{current.description}</p>
      )}
      <ToolList tools={current.tools} section="audience" icons={icons} />
    </div>
  );
}
