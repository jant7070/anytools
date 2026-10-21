import type { ToolSeed } from "../types.js";

export const convertImageSeed: ToolSeed = {
  slug: "convert-image",
  category: "image",
  runMode: "queue",
  status: "draft",
  featured: false,
  sortOrder: 20,
  audiences: ["designers", "content-creators", "office"],
  translations: {
    es: {
      name: "Convertir imagen",
      shortDescription: "Convierte entre JPG, PNG, WebP y AVIF.",
      seoTitle: "Convertir imágenes a JPG, PNG, WebP o AVIF",
      seoDescription:
        "Cambia el formato de tus imágenes en segundos: JPG, PNG, WebP y AVIF. Gratis y sin instalar nada.",
      contentMd: `## Cambia de formato en segundos

Convierte tus imágenes al formato que necesites: **WebP** y **AVIF** para la web, **PNG** para transparencias o **JPG** para máxima compatibilidad.`,
    },
    en: {
      name: "Convert image",
      shortDescription: "Convert between JPG, PNG, WebP and AVIF.",
      seoTitle: "Convert images to JPG, PNG, WebP or AVIF",
      seoDescription:
        "Change your image format in seconds: JPG, PNG, WebP and AVIF. Free, nothing to install.",
      contentMd: `## Change format in seconds

Convert your images to the format you need: **WebP** and **AVIF** for the web, **PNG** for transparency or **JPG** for maximum compatibility.`,
    },
  },
};
