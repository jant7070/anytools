const metaModules = import.meta.glob('../features/**/*.meta.js', { eager: true })

/** @type {import('./types').ToolMeta[]} */
export const tools = Object.values(metaModules)
  .flatMap((mod) => Object.values(mod))
  .filter((meta) => meta && meta.id && meta.slug && meta.categoryId)

