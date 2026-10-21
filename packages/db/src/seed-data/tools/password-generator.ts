import type { ToolSeed } from "../types.js";

export const passwordGeneratorSeed: ToolSeed = {
  slug: "password-generator",
  category: "security",
  runMode: "sync",
  status: "draft",
  featured: true,
  sortOrder: 10,
  audiences: ["developers", "office", "students"],
  translations: {
    es: {
      name: "Generador de contraseñas",
      shortDescription: "Crea contraseñas fuertes y aleatorias en un clic.",
      seoTitle: "Generador de contraseñas seguras y aleatorias",
      seoDescription:
        "Genera contraseñas fuertes al instante: elige la longitud, mayúsculas, números y símbolos. Aleatoriedad criptográfica, sin guardar nada.",
      contentMd: `## ¿Cómo funciona?

Elige la longitud y los tipos de caracteres (minúsculas, mayúsculas, números y símbolos) y pulsa **Generar**. Cada contraseña se crea con un generador criptográficamente seguro y no se guarda en ningún sitio.

## Consejos para una contraseña segura

- Usa **al menos 16 caracteres**: la longitud es lo que más aumenta la seguridad.
- Combina varios tipos de caracteres.
- No reutilices la misma contraseña en distintos sitios.
- Guárdalas en un gestor de contraseñas.

## ¿Qué es la entropía?

La entropía, medida en bits, indica cuántos intentos haría falta probar para adivinar la contraseña. A partir de **80 bits** se considera muy fuerte.`,
    },
    en: {
      name: "Password generator",
      shortDescription: "Create strong, random passwords in one click.",
      seoTitle: "Strong random password generator",
      seoDescription:
        "Generate strong passwords instantly: choose length, uppercase, numbers and symbols. Cryptographically secure randomness, nothing stored.",
      contentMd: `## How does it work?

Pick a length and the character types (lowercase, uppercase, numbers and symbols) and press **Generate**. Every password is created with a cryptographically secure generator and is never stored.

## Tips for a strong password

- Use **at least 16 characters**: length adds the most security.
- Mix several character types.
- Never reuse the same password across sites.
- Keep them in a password manager.

## What is entropy?

Entropy, measured in bits, tells you how many guesses it would take to crack a password. Anything above **80 bits** is considered very strong.`,
    },
  },
};
