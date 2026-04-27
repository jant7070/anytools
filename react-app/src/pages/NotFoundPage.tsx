import { Link, useLocation } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { SEO } from '../components/seo/SEO'

export const NotFoundPage = () => {
  const location = useLocation()

  return (
    <div className="space-y-6">
      <SEO title="Not found | Tools" description="This page could not be found." />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          Page not found
        </h1>
        <p className="text-zinc-300">
          No match for <span className="font-mono text-zinc-200">{location.pathname}</span>
        </p>
      </div>

      <Link to="/" aria-label="Go back home">
        <Button variant="secondary">Back home</Button>
      </Link>
    </div>
  )
}

