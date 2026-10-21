import type { ToolSeed } from "../types.js";

export const usernameGeneratorSeed: ToolSeed = {
  slug: "username-generator",
  category: "generators",
  runMode: "sync",
  status: "draft",
  featured: false,
  sortOrder: 10,
  audiences: ["content-creators", "students"],
  translations: {
    es: {
      name: "Generador de nombres de usuario",
      shortDescription: "Ideas de nombres de usuario originales para redes y juegos.",
      seoTitle: "Generador de nombres de usuario originales",
      seoDescription:
        "Encuentra un nombre de usuario único para redes sociales, juegos o tu marca personal.",
      contentMd: `## Encuentra tu nombre

Genera ideas de nombres de usuario a partir de palabras clave, con o sin números, listas para usar en redes sociales y juegos.`,
    },
    en: {
      name: "Username generator",
      shortDescription: "Original username ideas for social media and games.",
      seoTitle: "Original username generator",
      seoDescription: "Find a unique username for social media, games or your personal brand.",
      contentMd: `## Find your name

Generate username ideas from keywords, with or without numbers, ready to use on social media and games.`,
    },
  },
};
