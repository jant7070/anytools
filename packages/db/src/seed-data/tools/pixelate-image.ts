import type { ToolSeed } from "../types.js";

export const pixelateImageSeed: ToolSeed = {
  slug: "pixelate-image",
  category: "image",
  runMode: "queue",
  status: "draft",
  featured: true,
  sortOrder: 30,
  audiences: ["content-creators", "designers", "office"],
  translations: {
    es: {
      name: "Pixelar o difuminar foto",
      shortDescription: "Pixela o difumina una imagen para ocultar detalles.",
      seoTitle: "Pixelar y difuminar fotos online",
      seoDescription:
        "Pixela o difumina una foto en segundos para ocultar caras, matrículas o datos sensibles. Ajusta la intensidad y descarga el resultado.",
      contentMd: `## ¿Para qué sirve?

Para ocultar información sensible antes de compartir una imagen: caras, matrículas, documentos o pantallas con datos personales.

## Cómo usarla

1. Sube una imagen JPG, PNG o WebP (máx. 10 MB).
2. Elige el modo: **pixelar** (bloques) o **difuminar** (desenfoque gaussiano).
3. Ajusta la intensidad y pulsa **Procesar**.
4. Descarga el resultado. El archivo se borra automáticamente a los 30 minutos.

## Privacidad

La imagen procesada pierde sus metadatos (EXIF, ubicación GPS), así que también es una forma rápida de limpiar una foto antes de publicarla.`,
    },
    en: {
      name: "Pixelate or blur photo",
      shortDescription: "Pixelate or blur an image to hide details.",
      seoTitle: "Pixelate and blur photos online",
      seoDescription:
        "Pixelate or blur a photo in seconds to hide faces, license plates or sensitive data. Adjust the intensity and download the result.",
      contentMd: `## What is it for?

To hide sensitive information before sharing an image: faces, license plates, documents or screenshots with personal data.

## How to use it

1. Upload a JPG, PNG or WebP image (max 10 MB).
2. Choose a mode: **pixelate** (blocks) or **blur** (gaussian blur).
3. Adjust the intensity and press **Process**.
4. Download the result. The file is deleted automatically after 30 minutes.

## Privacy

The processed image is stripped of its metadata (EXIF, GPS location), so it is also a quick way to clean up a photo before publishing it.`,
    },
  },
};
