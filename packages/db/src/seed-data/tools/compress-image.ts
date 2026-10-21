import type { ToolSeed } from "../types.js";

export const compressImageSeed: ToolSeed = {
  slug: "compress-image",
  category: "image",
  runMode: "queue",
  status: "draft",
  featured: false,
  sortOrder: 10,
  audiences: ["content-creators", "designers", "developers"],
  translations: {
    es: {
      name: "Comprimir imagen",
      shortDescription: "Reduce el peso de JPG, PNG y WebP sin perder calidad visible.",
      seoTitle: "Comprimir imágenes online: JPG, PNG y WebP",
      seoDescription:
        "Reduce el tamaño de tus imágenes manteniendo la calidad. Ideal para webs, correos y redes sociales.",
      contentMd: `## Imágenes más ligeras

Comprime tus fotos para que carguen más rápido en tu web o para enviarlas por correo sin superar los límites de tamaño.

## Formatos admitidos

JPG, PNG y WebP.`,
    },
    en: {
      name: "Compress image",
      shortDescription: "Shrink JPG, PNG and WebP files without visible quality loss.",
      seoTitle: "Compress images online: JPG, PNG and WebP",
      seoDescription:
        "Reduce image file size while keeping quality. Perfect for websites, email and social media.",
      contentMd: `## Lighter images

Compress your photos so they load faster on your site or fit within email attachment limits.

## Supported formats

JPG, PNG and WebP.`,
    },
  },
};
