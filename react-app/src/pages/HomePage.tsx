import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { SEO } from '../components/seo/SEO'
import { tools } from '../data/tools'

export const HomePage = () => {
  return (
    <div className="space-y-10">
      <SEO
        title="Tools"
        description="A collection of fast, privacy-friendly tools built with React + Vite."
      />

      <section className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">
          A toolbox that scales
        </h1>
        <p className="max-w-2xl text-zinc-300">
          Each tool lives in its own module: page, UI, logic, metadata, and tests when
          you need them.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            Featured tools
          </h2>
          <Link
            to="/tools"
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            aria-label="View all tools"
          >
            View all
          </Link>
        </div>

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
      </section>
    </div>
  )
}

