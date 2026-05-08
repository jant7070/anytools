import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from './Card'

export const ToolCard = ({ tool, lang }) => {
  const { t } = useTranslation(tool.i18nKey)
  const name = t('meta.name')
  const description = t('meta.description')

  return (
    <Link
      to={`/${lang}${tool.slug}`}
      className="group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      aria-label={`Open ${name}`}
    >
      <Card className="h-full p-5 transition group-hover:ring-zinc-700">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-100">{name}</p>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </Card>
    </Link>
  )
}

