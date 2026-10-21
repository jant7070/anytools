import type { AudienceSeed } from "./types.js";

export const audienceSeeds: AudienceSeed[] = [
  {
    slug: "students",
    sortOrder: 10,
    translations: {
      es: { name: "Estudiantes", description: "Para tareas, trabajos y presentaciones." },
      en: { name: "Students", description: "For homework, papers and presentations." },
    },
  },
  {
    slug: "developers",
    sortOrder: 20,
    translations: {
      es: { name: "Desarrolladores", description: "Utilidades rápidas para el día a día." },
      en: { name: "Developers", description: "Quick utilities for everyday work." },
    },
  },
  {
    slug: "designers",
    sortOrder: 30,
    translations: {
      es: { name: "Diseñadores", description: "Prepara y optimiza recursos visuales." },
      en: { name: "Designers", description: "Prepare and optimize visual assets." },
    },
  },
  {
    slug: "content-creators",
    sortOrder: 40,
    translations: {
      es: {
        name: "Creadores de contenido",
        description: "Imágenes y textos listos para publicar.",
      },
      en: { name: "Content creators", description: "Images and copy ready to publish." },
    },
  },
  {
    slug: "office",
    sortOrder: 50,
    translations: {
      es: { name: "Oficina", description: "Documentos y tareas administrativas." },
      en: { name: "Office", description: "Documents and admin tasks." },
    },
  },
];
