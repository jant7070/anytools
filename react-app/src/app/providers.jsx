import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import i18n, { initI18n, normalizeLang } from '../i18n/i18n'

export const AppProviders = ({ children }) => {
  const params = useParams()
  const [ready, setReady] = useState(i18n.isInitialized)
  const isChangingLangRef = useRef(false)

  const lang = useMemo(() => {
    return normalizeLang(params.lang)
  }, [params.lang])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      await initI18n()
      if (cancelled) return
      setReady(true)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return

    document.documentElement.lang = lang
    const currentLang = normalizeLang(i18n.resolvedLanguage ?? i18n.language)
    if (currentLang === lang) return
    if (isChangingLangRef.current) return

    isChangingLangRef.current = true
    Promise.resolve(i18n.changeLanguage(lang)).finally(() => {
      isChangingLangRef.current = false
    })
  }, [lang, ready])

  if (!ready) return null

  return children
}

