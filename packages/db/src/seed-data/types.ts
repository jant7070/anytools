import type { Locale, ToolRunMode, ToolStatus } from "@anytools/shared";

export interface TranslatedText {
  name: string;
  description: string;
}

export interface CategorySeed {
  slug: string;
  icon: string;
  sortOrder: number;
  translations: Record<Locale, TranslatedText>;
}

export interface AudienceSeed {
  slug: string;
  sortOrder: number;
  translations: Record<Locale, TranslatedText>;
}

export interface ToolTranslationSeed {
  name: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  contentMd: string;
}

export interface ToolSeed {
  slug: string;
  category: string;
  runMode: ToolRunMode;
  status: ToolStatus;
  featured: boolean;
  sortOrder: number;
  audiences: string[];
  translations: Record<Locale, ToolTranslationSeed>;
}
