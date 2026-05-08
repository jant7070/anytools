import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/common/Card'
import { ToolCard } from '../components/common/ToolCard'
import { SEO } from '../components/seo/SEO'
import { categories } from '../data/categories'
import { tools } from '../data/tools'

export const CategoryPage = ({ categoryId }) => {
  const { t } = useTranslation('pages')
  const { lang = 'en' } = useParams()
  const category = categories.find((c) => c.id === categoryId)
  const categoryTools = tools.filter((tool) => tool.categoryId === categoryId)

  if (!category) {
    return <NotFoundCategory />
  }

  const categoryName = t(`${category.i18nKey}.name`)
  const categoryDescription = t(`${category.i18nKey}.description`)

  return (
    <div className="space-y-6">
      <SEO title={`${categoryName} | Tools`} description={categoryDescription} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          {categoryName}
        </h1>
        <p className="max-w-2xl text-zinc-300">{categoryDescription}</p>
      </header>

      {categoryTools.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-zinc-300">{t('category.empty')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}

const NotFoundCategory = () => {
  const { t } = useTranslation('pages')

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        {t('category.notFoundTitle')}
      </h1>
      <p className="text-zinc-300">{t('category.notFoundSubtitle')}</p>
    </div>
  )
}

