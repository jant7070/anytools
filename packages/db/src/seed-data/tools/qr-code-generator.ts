import type { ToolSeed } from "../types.js";

export const qrCodeGeneratorSeed: ToolSeed = {
  slug: "qr-code-generator",
  category: "generators",
  runMode: "sync",
  status: "draft",
  featured: false,
  sortOrder: 20,
  audiences: ["office", "content-creators", "designers"],
  translations: {
    es: {
      name: "Generador de QR",
      shortDescription: "Crea códigos QR para enlaces, textos o redes Wi-Fi.",
      seoTitle: "Generador de códigos QR gratis",
      seoDescription:
        "Crea códigos QR para enlaces, textos o redes Wi-Fi y descárgalos en PNG o SVG.",
      contentMd: `## QR en segundos

Convierte un enlace, un texto o los datos de tu Wi-Fi en un código QR listo para imprimir o compartir.`,
    },
    en: {
      name: "QR code generator",
      shortDescription: "Create QR codes for links, text or Wi-Fi networks.",
      seoTitle: "Free QR code generator",
      seoDescription:
        "Create QR codes for links, text or Wi-Fi networks and download them as PNG or SVG.",
      contentMd: `## QR codes in seconds

Turn a link, some text or your Wi-Fi details into a QR code ready to print or share.`,
    },
  },
};
