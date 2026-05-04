import bg from './bg.json'
import en from './en.json'

const MISSING = Symbol('missing')

const translations = { bg, en }
let currentLanguage = 'bg'
const _subscribers = new Set()

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
    _subscribers.forEach(fn => fn())
  }
}

export function subscribeToLanguage(callback) {
  _subscribers.add(callback)
  return () => _subscribers.delete(callback)
}

export function getLanguageSnapshot() {
  return currentLanguage
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
