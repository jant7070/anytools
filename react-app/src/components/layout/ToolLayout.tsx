import type { ReactNode } from 'react'
import type { ToolMeta } from '../../data/types'
import { SEO } from '../seo/SEO'

type ToolLayoutProps = {
  meta: ToolMeta
  children: ReactNode
}

export const ToolLayout = ({ meta, children }: ToolLayoutProps) => {
  return (
    <>
      <SEO title={`${meta.name} | Tools`} description={meta.description} />

      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          {meta.name}
        </h1>
        <p className="max-w-2xl text-zinc-300">{meta.description}</p>
      </header>

      {children}
    </>
  )
}

