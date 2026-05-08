import { describe, it, expect } from 'vitest'
import { tools } from './tools'
import { categories } from './categories'

describe('tools registry', () => {
  it('auto-discovers at least one tool', () => {
    expect(tools.length).toBeGreaterThanOrEqual(1)
  })

  it('every tool has required fields', () => {
    for (const tool of tools) {
      expect(tool).toHaveProperty('id')
      expect(tool).toHaveProperty('slug')
      expect(tool).toHaveProperty('categoryId')
      expect(tool).toHaveProperty('i18nKey')
    }
  })

  it('every tool references a valid category', () => {
    const categoryIds = new Set(categories.map((c) => c.id))
    for (const tool of tools) {
      expect(categoryIds.has(tool.categoryId)).toBe(true)
    }
  })

  it('slugs start with /', () => {
    for (const tool of tools) {
      expect(tool.slug.startsWith('/')).toBe(true)
    }
  })
})

describe('categories registry', () => {
  it('has at least one category', () => {
    expect(categories.length).toBeGreaterThanOrEqual(1)
  })

  it('every category has required fields', () => {
    for (const cat of categories) {
      expect(cat).toHaveProperty('id')
      expect(cat).toHaveProperty('slug')
      expect(cat).toHaveProperty('i18nKey')
    }
  })

  it('category IDs are unique', () => {
    const ids = categories.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
