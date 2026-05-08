import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enPages from './locales/en/pages.json'
import esCommon from './locales/es/common.json'
import esPages from './locales/es/pages.json'

const toolTranslations = import.meta.glob('./locales/*/tools/*.json', { eager: true })

export const SUPPORTED_LANGS = /** @type {const} */ (['en', 'es'])

export const normalizeLang = (lang) => {
  if (lang === 'es') return 'es'
  return 'en'
}

const resources = {
  en: { common: enCommon, pages: enPages },
  es: { common: esCommon, pages: esPages },
}

const toolNamespaces = []

for (const [path, mod] of Object.entries(toolTranslations)) {
  const match = path.match(/\.\/locales\/(\w+)\/tools\/(.+)\.json$/)
  if (!match) continue
  const [, lang, toolName] = match
  const ns = `tools/${toolName}`
  if (!resources[lang]) continue
  resources[lang][ns] = mod.default || mod
  if (!toolNamespaces.includes(ns)) toolNamespaces.push(ns)
}

export { resources }

export const initI18n = async () => {
  if (i18n.isInitialized) return i18n

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: SUPPORTED_LANGS,
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common', 'pages', ...toolNamespaces],
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
      interpolation: {
        escapeValue: false,
      },
      returnObjects: true,
    })

  return i18n
}

export default i18n

