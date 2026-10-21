import type { ToolSeed } from "../types.js";

export const resizeImageSeed: ToolSeed = {
  slug: "resize-image",
  category: "image",
  runMode: "queue",
  status: "draft",
  featured: false,
  sortOrder: 40,
  audiences: ["content-creators", "designers", "students"],
  translations: {
    es: {
      name: "Redimensionar imagen",
      shortDescription: "Cambia el tamaño de una imagen en píxeles o porcentaje.",
      seoTitle: "Redimensionar imágenes online",
      seoDescription:
        "Cambia el ancho y alto de tus imágenes manteniendo la proporción. Perfecto para redes sociales y webs.",
      contentMd: `## Tamaño exacto para cada uso

Ajusta tus imágenes a las medidas que piden las redes sociales, tu web o un formulario, manteniendo la proporción original.`,
    },
    en: {
      name: "Resize image",
      shortDescription: "Resize an image by pixels or percentage.",
      seoTitle: "Resize images online",
      seoDescription:
        "Change the width and height of your images while keeping the aspect ratio. Perfect for social media and websites.",
      contentMd: `## The exact size for every use

Fit your images to the dimensions social networks, your website or a form require, keeping the original aspect ratio.`,
    },
  },
};
