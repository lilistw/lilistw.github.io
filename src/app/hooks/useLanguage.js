import { useState, useCallback } from 'react'
import { setLanguage as setI18nLanguage } from '../localization/i18n.js'
import { getStoredLanguage, storeLanguage } from './languageStorage.js'

function resolveInitialLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get('lang')
  if (urlLang === 'bg' || urlLang === 'en') return urlLang
  const stored = getStoredLanguage()
  if (stored === 'bg' || stored === 'en') return stored
  return 'bg'
}

export function useLanguage() {
  const [language, setLanguageState] = useState(() => {
    const lang = resolveInitialLanguage()
    setI18nLanguage(lang)
    return lang
  })

  const switchLanguage = useCallback((lang) => {
    setI18nLanguage(lang)
    storeLanguage(lang)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', lang)
    window.history.replaceState({}, '', url)
    setLanguageState(lang)
  }, [])

  return [language, switchLanguage]
}
