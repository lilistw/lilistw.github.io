import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import bg from './bg.json'
import en from './en.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      bg: { translation: bg },
      en: { translation: en },
    },
    lng: 'bg',
    fallbackLng: 'bg',
    interpolation: {
      escapeValue: false,
    },
  })

export function setLanguage(lang) {
  if (lang === 'bg' || lang === 'en') {
    i18n.changeLanguage(lang)
  }
}

export function getLanguage() {
  return i18n.language
}

// Plain function for non-React callers (presenters, hooks)
export function t(key, options) {
  return i18n.t(key, options)
}

export default i18n
