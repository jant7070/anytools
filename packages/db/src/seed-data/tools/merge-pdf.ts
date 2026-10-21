import type { ToolSeed } from "../types.js";

export const mergePdfSeed: ToolSeed = {
  slug: "merge-pdf",
  category: "pdf",
  runMode: "queue",
  status: "draft",
  featured: false,
  sortOrder: 10,
  audiences: ["office", "students"],
  translations: {
    es: {
      name: "Unir PDF",
      shortDescription: "Combina varios PDF en un solo documento.",
      seoTitle: "Unir PDF online: combina varios archivos en uno",
      seoDescription:
        "Junta varios archivos PDF en un único documento y ordénalos como quieras. Rápido y gratis.",
      contentMd: `## Un solo documento

Combina facturas, apuntes o informes en un único PDF, en el orden que elijas.`,
    },
    en: {
      name: "Merge PDF",
      shortDescription: "Combine several PDFs into a single document.",
      seoTitle: "Merge PDF online: combine multiple files into one",
      seoDescription:
        "Join multiple PDF files into a single document and reorder them as you like. Fast and free.",
      contentMd: `## One single document

Combine invoices, notes or reports into a single PDF, in the order you choose.`,
    },
  },
};
