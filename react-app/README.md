# AnyTools

A modular, scalable tool collection built with React 19, Vite, and Tailwind CSS. Each tool lives in its own self-contained feature module and is auto-discovered at build time — no manual registration required.

## Stack

- **React 19** + React Router 7
- **Vite 8** with code splitting per tool
- **Tailwind CSS 4** (dark theme)
- **i18next** with English and Spanish support
- **Vitest** for testing

## Getting started

```bash
npm install
npm run dev       # Dev server on http://localhost:5174
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Vitest
```

## Adding a new tool

Run the scaffolding script:

```bash
npm run new-tool <category-id> <tool-id>
# Example:
npm run new-tool image-tools resize-image
```

This creates the feature module and translation files. **No other files need editing** — routes, the tool registry, and i18n namespaces are all auto-discovered via `import.meta.glob`.

### Generated structure

```
src/features/<category>/<tool>/
  index.js            Barrel export (lazy-loaded by router)
  <tool>.meta.js      Metadata: id, slug, categoryId, i18nKey
  <Tool>Page.jsx      Route-level page component
  <tool>.utils.js     Pure business logic

src/i18n/locales/en/tools/<tool>.json   English translations
src/i18n/locales/es/tools/<tool>.json   Spanish translations
```

### Categories

Tools are grouped by category. Existing categories (defined in `src/data/categories.js`):

| ID | Slug |
|----|------|
| image-tools | /image-tools |
| pdf-tools | /pdf-tools |
| text-tools | /text-tools |
| calculators | /calculators |
| developer-tools | /developer-tools |
| generators | /generators |

To add a new category, add an entry to `src/data/categories.js`. Routes are generated automatically.

## Architecture

```
src/
  app/            App shell, routing, providers
  components/     Shared UI (Button, Card, FileInput, RangeSlider, layouts)
  data/           Tool + category registries (auto-discovered)
  features/       Self-contained tool modules
  i18n/           i18next setup + locale files (auto-discovered)
  pages/          Top-level pages (Home, Tools, Category, 404)
  utils/          Shared utility functions
```

### Key patterns

- **Auto-discovery**: `import.meta.glob` collects `*.meta.js` files and translation JSONs at build time
- **Code splitting**: Each tool page is `React.lazy`-loaded, producing a separate chunk
- **Error boundaries**: Root-level and per-tool error boundaries catch render failures
- **i18n namespacing**: Each tool gets its own namespace (`tools/<tool-id>`)
- **Path aliases**: `@/` maps to `src/` for clean imports from feature modules
