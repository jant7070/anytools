import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const Header = () => {
  const { t } = useTranslation('common')
  const { lang = 'en' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const navLinkClassName = ({ isActive }) => {
    return [
      'rounded-lg px-3 py-2 text-sm font-medium transition',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
      isActive ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:bg-zinc-900/70',
    ].join(' ')
  }

  const handleChangeLanguage = (nextLang) => {
    if (nextLang === lang) return

    const path = location.pathname || '/'
    const parts = path.split('/')

    const hasLocalePrefix = parts.length > 1 && (parts[1] === 'en' || parts[1] === 'es')
    if (!hasLocalePrefix) {
      navigate(`/${nextLang}`, { replace: true })
      return
    }

    parts[1] = nextLang
    const nextPath = parts.join('/') || `/${nextLang}`
    navigate(nextPath, { replace: true })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link
          to={`/${lang}`}
          className="rounded-lg px-2 py-1 text-sm font-semibold tracking-tight text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          aria-label="Go to homepage"
        >
          {t('siteName')}
        </Link>

        <div className="flex items-center gap-3">
          <nav aria-label="Primary navigation" className="flex items-center gap-2">
            <NavLink to={`/${lang}/tools`} className={navLinkClassName}>
              {t('nav.allTools')}
            </NavLink>
            <NavLink to={`/${lang}/image-tools`} className={navLinkClassName}>
              {t('nav.image')}
            </NavLink>
          </nav>

          <div
            className="flex items-center gap-1 rounded-lg bg-zinc-950 ring-1 ring-zinc-800/80 p-1"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => handleChangeLanguage('en')}
              className={[
                'rounded-md px-2 py-1 text-xs font-medium transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                lang === 'en' ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900/70',
              ].join(' ')}
              aria-label={t('lang.en')}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleChangeLanguage('es')}
              className={[
                'rounded-md px-2 py-1 text-xs font-medium transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                lang === 'es' ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900/70',
              ].join(' ')}
              aria-label={t('lang.es')}
              aria-pressed={lang === 'es'}
            >
              ES
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

