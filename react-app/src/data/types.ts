export type CategoryMeta = {
  id: string
  name: string
  slug: `/${string}`
  description: string
}

export type ToolMeta = {
  id: string
  name: string
  slug: `/${string}`
  categoryId: string
  description: string
  keywords: string[]
}

