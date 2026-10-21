import type { ToolSeed } from "../types.js";

export const wordCounterSeed: ToolSeed = {
  slug: "word-counter",
  category: "text",
  runMode: "sync",
  status: "draft",
  featured: false,
  sortOrder: 10,
  audiences: ["students", "content-creators", "office"],
  translations: {
    es: {
      name: "Contador de palabras",
      shortDescription: "Cuenta palabras, caracteres, frases y tiempo de lectura.",
      seoTitle: "Contador de palabras y caracteres online",
      seoDescription:
        "Cuenta palabras, caracteres con y sin espacios, frases, párrafos y tiempo de lectura de cualquier texto.",
      contentMd: `## Todo sobre tu texto

Pega tu texto y obtén al instante el número de palabras, caracteres (con y sin espacios), frases, párrafos y el tiempo estimado de lectura.`,
    },
    en: {
      name: "Word counter",
      shortDescription: "Count words, characters, sentences and reading time.",
      seoTitle: "Online word and character counter",
      seoDescription:
        "Count words, characters with and without spaces, sentences, paragraphs and reading time of any text.",
      contentMd: `## Everything about your text

Paste your text and instantly get the number of words, characters (with and without spaces), sentences, paragraphs and estimated reading time.`,
    },
  },
};
