import type { CategorySeed } from "./types.js";

export const categorySeeds: CategorySeed[] = [
  {
    slug: "image",
    icon: "image",
    sortOrder: 10,
    translations: {
      es: { name: "Imagen", description: "Comprime, convierte, redimensiona y edita imágenes." },
      en: { name: "Image", description: "Compress, convert, resize and edit images." },
    },
  },
  {
    slug: "pdf",
    icon: "file-text",
    sortOrder: 20,
    translations: {
      es: { name: "PDF", description: "Une, divide y organiza documentos PDF." },
      en: { name: "PDF", description: "Merge, split and organize PDF documents." },
    },
  },
  {
    slug: "security",
    icon: "shield",
    sortOrder: 30,
    translations: {
      es: { name: "Seguridad", description: "Contraseñas seguras y privacidad." },
      en: { name: "Security", description: "Strong passwords and privacy." },
    },
  },
  {
    slug: "generators",
    icon: "sparkles",
    sortOrder: 40,
    translations: {
      es: { name: "Generadores", description: "Nombres de usuario, códigos QR y más." },
      en: { name: "Generators", description: "Usernames, QR codes and more." },
    },
  },
  {
    slug: "text",
    icon: "type",
    sortOrder: 50,
    translations: {
      es: { name: "Texto", description: "Cuenta, limpia y transforma texto." },
      en: { name: "Text", description: "Count, clean up and transform text." },
    },
  },
  {
    slug: "development",
    icon: "code",
    sortOrder: 60,
    translations: {
      es: { name: "Desarrollo", description: "Utilidades para programadores." },
      en: { name: "Development", description: "Utilities for developers." },
    },
  },
];
