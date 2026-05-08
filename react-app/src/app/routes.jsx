import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppProviders } from './providers'
import { MainLayout } from '../components/layout/MainLayout'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { Loading } from '../components/common/Loading'
import { CategoryPage } from '../pages/CategoryPage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ToolsPage } from '../pages/ToolsPage'
import { categories } from '../data/categories'
import { tools } from '../data/tools'
import { SUPPORTED_LANGS } from '../i18n/i18n'

const toolPageModules = import.meta.glob('../features/**/index.js')

const detectInitialLang = () => {
  if (typeof navigator === 'undefined') return 'en'
  const lang = String(navigator.language || '').toLowerCase()
  if (lang.startsWith('es')) return 'es'
  return 'en'
}

const langPattern = SUPPORTED_LANGS.join('|')

const toolRoutes = tools.map((tool) => {
  const importPath = `../features${tool.slug}/index.js`
  const loader = toolPageModules[importPath]
  if (!loader) return null
  const LazyPage = lazy(loader)
  return {
    path: tool.slug.slice(1),
    element: (
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <LazyPage />
        </Suspense>
      </ErrorBoundary>
    ),
  }
}).filter(Boolean)

const categoryRoutes = categories.map((cat) => ({
  path: cat.slug.slice(1),
  element: <CategoryPage categoryId={cat.id} />,
}))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={`/${detectInitialLang()}`} replace />,
  },
  {
    path: `/:lang(${langPattern})`,
    element: (
      <AppProviders>
        <MainLayout />
      </AppProviders>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tools', element: <ToolsPage /> },
      ...categoryRoutes,
      ...toolRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

