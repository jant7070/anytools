"use client";

import type { ToolClickSection, ToolSummary } from "@anytools/shared";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/tracker";
import { CategoryIcon } from "./icons";

export interface ToolCardProps {
  tool: ToolSummary;
  icon: string;
  section: ToolClickSection;
  draftLabel: string;
}

export function ToolCard({ tool, icon, section, draftLabel }: ToolCardProps) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      onClick={() => track({ type: "tool_click", toolSlug: tool.slug, props: { section } })}
      className="card group flex h-full gap-4 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-700"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl text-brand-600 dark:bg-brand-900/40 dark:text-brand-200">
        <CategoryIcon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-200">
            {tool.name}
          </span>
          {tool.status === "draft" && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {draftLabel}
            </span>
          )}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm text-slate-600 dark:text-slate-400">
          {tool.shortDescription}
        </span>
      </span>
    </Link>
  );
}

export function ToolGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}
