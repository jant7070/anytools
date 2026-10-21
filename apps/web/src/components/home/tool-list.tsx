"use client";

import type { ToolClickSection, ToolSummary } from "@anytools/shared";
import { useTranslations } from "next-intl";
import { ToolCard, ToolGrid } from "../tool-card";

export interface ToolListProps {
  tools: ToolSummary[];
  section: ToolClickSection;
  /** category slug → icon name */
  icons: Record<string, string>;
}

export function ToolList({ tools, section, icons }: ToolListProps) {
  const t = useTranslations("tool");
  return (
    <ToolGrid>
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard
            tool={tool}
            section={section}
            icon={icons[tool.categorySlug] ?? "tool"}
            draftLabel={t("draft")}
          />
        </li>
      ))}
    </ToolGrid>
  );
}
