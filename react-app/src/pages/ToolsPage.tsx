import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { SEO } from '../components/seo/SEO'
import { tools } from '../data/tools'

export const ToolsPage = () => {
  return (
    <div className="space-y-6">
      <SEO title="All tools | Tools" description="Browse all tools." />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">All tools</h1>
        <p className="max-w-2xl text-zinc-300">
          Tools are grouped by category and shipped as isolated feature modules.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
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
    </div>
  )
}

