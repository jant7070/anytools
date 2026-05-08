#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const [, , rawCategory, rawTool] = process.argv

if (!rawCategory || !rawTool) {
  console.error('Usage: node scripts/new-tool.js <category-id> <tool-id>')
  console.error('Example: node scripts/new-tool.js image-tools resize-image')
  process.exit(1)
}

const category = rawCategory.toLowerCase()
const tool = rawTool.toLowerCase()
const camel = tool.replace(/-(\w)/g, (_, c) => c.toUpperCase())
const pascal = camel[0].toUpperCase() + camel.slice(1)

const root = path.resolve(import.meta.dirname, '..')
const featureDir = path.join(root, 'src', 'features', category, tool)
const enDir = path.join(root, 'src', 'i18n', 'locales', 'en', 'tools')
const esDir = path.join(root, 'src', 'i18n', 'locales', 'es', 'tools')

if (existsSync(featureDir)) {
  console.error(`Feature directory already exists: ${featureDir}`)
  process.exit(1)
}

mkdirSync(featureDir, { recursive: true })
mkdirSync(enDir, { recursive: true })
mkdirSync(esDir, { recursive: true })

const files = {
  [`${featureDir}/index.js`]:
`export { ${pascal}Page as default } from './${pascal}Page'
export { ${camel}Meta } from './${camel}.meta'
`,

  [`${featureDir}/${camel}.meta.js`]:
`export const ${camel}Meta = {
  id: '${tool}',
  slug: '/${category}/${tool}',
  categoryId: '${category}',
  i18nKey: 'tools/${tool}',
}
`,

  [`${featureDir}/${pascal}Page.jsx`]:
`import { ToolLayout } from '@/components/layout/ToolLayout'
import { ${camel}Meta } from './${camel}.meta'

export const ${pascal}Page = () => (
  <ToolLayout meta={${camel}Meta}>
    <p className="text-zinc-400">TODO: implement ${pascal}Tool</p>
  </ToolLayout>
)
`,

  [`${featureDir}/${camel}.utils.js`]:
`// Pure utility functions for ${tool}
`,

  [`${enDir}/${tool}.json`]:
JSON.stringify({
  meta: { name: pascal.replace(/([A-Z])/g, ' $1').trim(), description: `TODO: describe ${tool}`, keywords: [] },
  tool: {},
}, null, 2) + '\n',

  [`${esDir}/${tool}.json`]:
JSON.stringify({
  meta: { name: `TODO: ${tool} (es)`, description: `TODO: describir ${tool}`, keywords: [] },
  tool: {},
}, null, 2) + '\n',
}

for (const [filePath, content] of Object.entries(files)) {
  writeFileSync(filePath, content, 'utf-8')
  console.log(`  created ${path.relative(root, filePath)}`)
}

console.log(`\nDone! Tool "${tool}" scaffolded in ${category}.`)
console.log('No other files need editing — routes and i18n are auto-discovered.')
