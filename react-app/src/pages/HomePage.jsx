import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToolCard } from '../components/common/ToolCard'
import { SEO } from '../components/seo/SEO'
import { tools } from '../data/tools'

export const HomePage = () => {
  const { t } = useTranslation('pages')
  const { lang = 'en' } = useParams()

  return (
    <div className="space-y-10">
      <SEO
        title={t('home.seoTitle')}
        description={t('home.seoDescription')}
      />

      <section className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">
          {t('home.title')}
        </h1>
        <p className="max-w-2xl text-zinc-300">
          {t('home.subtitle')}
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            {t('home.featuredTools')}
          </h2>
          <Link
            to={`/${lang}/tools`}
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            aria-label="View all tools"
          >
            {t('home.viewAll')}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} lang={lang} />
          ))}
        </div>
      </section>
    </div>
  )
}

