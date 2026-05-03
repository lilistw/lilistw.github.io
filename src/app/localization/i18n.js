import bg from './bg.json'
import en from './en.json'

const MISSING = Symbol('missing')

const translations = { bg, en }
let currentLanguage = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'bg'

function getByPath(source, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc === MISSING || acc == null || typeof acc !== 'object' || !(key in acc)) return MISSING
    return acc[key]
  }, source)
}

function interpolate(value, vars) {
  if (typeof value !== 'string') return value
  return value.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const replacement = vars[key]
    return replacement == null ? '' : String(replacement)
  })
}

export function setLanguage(lang) {
  if (lang === 'bg' || lang === 'en') {
    currentLanguage = lang
  }
}

export function getLanguage() {
  return currentLanguage
}

export function t(key, options = {}) {
  const translated = getByPath(translations[currentLanguage], key)
  if (translated === MISSING) return key
  if (options.returnObjects) return translated
  return interpolate(translated, options)
}
