import { useEffect } from 'react'

type SEOProps = {
  title: string
  description?: string
}

const setOrCreateMeta = (name: string, content: string) => {
  const existing = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (existing) {
    existing.content = content
    return
  }

  const meta = document.createElement('meta')
  meta.name = name
  meta.content = content
  document.head.append(meta)
}

export const SEO = ({ title, description }: SEOProps) => {
  useEffect(() => {
    document.title = title
    if (description) setOrCreateMeta('description', description)
  }, [title, description])

  return null
}

