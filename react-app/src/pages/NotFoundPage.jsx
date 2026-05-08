import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/common/Button'
import { SEO } from '../components/seo/SEO'

export const NotFoundPage = () => {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const { lang = 'en' } = useParams()

  return (
    <div className="space-y-6">
      <SEO title={t('notFound.seoTitle')} description={t('notFound.seoDescription')} />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          {t('notFound.title')}
        </h1>
        <p className="text-zinc-300">
          {t('notFound.subtitlePrefix')}{' '}
          <span className="font-mono text-zinc-200">{location.pathname}</span>
        </p>
      </div>

      <Link to={`/${lang}`} aria-label="Go back home">
        <Button variant="secondary">{t('common:actions.backHome')}</Button>
      </Link>
    </div>
  )
}

