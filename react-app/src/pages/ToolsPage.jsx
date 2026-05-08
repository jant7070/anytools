import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToolCard } from '../components/common/ToolCard'
import { SEO } from '../components/seo/SEO'
import { tools } from '../data/tools'

export const ToolsPage = () => {
  const { t } = useTranslation('pages')
  const { lang = 'en' } = useParams()

  return (
    <div className="space-y-6">
      <SEO title={t('tools.seoTitle')} description={t('tools.seoDescription')} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          {t('tools.title')}
        </h1>
        <p className="max-w-2xl text-zinc-300">
          {t('tools.subtitle')}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} lang={lang} />
        ))}
      </div>
    </div>
  )
}

