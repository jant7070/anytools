import { SEO } from '../seo/SEO'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { useTranslation } from 'react-i18next'

export const ToolLayout = ({ meta, children }) => {
  const { t } = useTranslation(meta.i18nKey)
  const name = t('meta.name')
  const description = t('meta.description')

  return (
    <>
      <SEO title={`${name} | Tools`} description={description} />

      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          {name}
        </h1>
        <p className="max-w-2xl text-zinc-300">{description}</p>
      </header>

      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </>
  )
}

