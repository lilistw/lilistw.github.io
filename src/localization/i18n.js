import bg from './bg.json'

const MISSING = Symbol('missing')

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

export function t(key, options = {}) {
  const translated = getByPath(bg, key)
  if (translated === MISSING) return key
  if (options.returnObjects) return translated
  return interpolate(translated, options)
}
