import type { ToolSeed } from "../types.js";

export const splitPdfSeed: ToolSeed = {
  slug: "split-pdf",
  category: "pdf",
  runMode: "queue",
  status: "draft",
  featured: false,
  sortOrder: 20,
  audiences: ["office", "students"],
  translations: {
    es: {
      name: "Dividir PDF",
      shortDescription: "Extrae páginas o separa un PDF en varios archivos.",
      seoTitle: "Dividir PDF online: extrae páginas",
      seoDescription: "Separa un PDF en varios archivos o extrae solo las páginas que necesitas.",
      contentMd: `## Solo las páginas que necesitas

Extrae un rango de páginas o divide un documento largo en varios PDF más pequeños.`,
    },
    en: {
      name: "Split PDF",
      shortDescription: "Extract pages or split a PDF into several files.",
      seoTitle: "Split PDF online: extract pages",
      seoDescription: "Split a PDF into multiple files or extract only the pages you need.",
      contentMd: `## Only the pages you need

Extract a page range or split a long document into several smaller PDFs.`,
    },
  },
};
