import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { SEO } from '../components/seo/SEO'
import { categories } from '../data/categories'
import { tools } from '../data/tools'

type CategoryPageProps = {
  categoryId: string
}

export const CategoryPage = ({ categoryId }: CategoryPageProps) => {
  const category = categories.find((c) => c.id === categoryId)
  const categoryTools = tools.filter((tool) => tool.categoryId === categoryId)

  if (!category) {
    return <NotFoundCategory />
  }

  return (
    <div className="space-y-6">
      <SEO title={`${category.name} | Tools`} description={category.description} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          {category.name}
        </h1>
        <p className="max-w-2xl text-zinc-300">{category.description}</p>
      </header>

      {categoryTools.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-zinc-300">No tools in this category yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryTools.map((tool) => {
            return (
              <Link
                key={tool.id}
                to={tool.slug}
                className="group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                aria-label={`Open ${tool.name}`}
              >
                <Card className="h-full p-5 transition group-hover:ring-zinc-700">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-zinc-100">{tool.name}</p>
                    <p className="text-sm text-zinc-400">{tool.description}</p>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const NotFoundCategory = () => {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
        Category not found
      </h1>
      <p className="text-zinc-300">That category doesn’t exist.</p>
    </div>
  )
}

