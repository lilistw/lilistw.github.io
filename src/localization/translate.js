import React from 'react'
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

export function Trans({ i18nKey, values = {}, components = {} }) {
  const template = t(i18nKey, values)
  if (typeof template !== 'string') return null

  const nodes = []
  const tagPattern = /<([a-zA-Z0-9_]+)>(.*?)<\/\1>/gs
  let last = 0
  let match

  while ((match = tagPattern.exec(template))) {
    const [full, tagName, inner] = match
    if (match.index > last) nodes.push(template.slice(last, match.index))

    const component = components[tagName]
    if (component) nodes.push(React.cloneElement(component, { key: `${tagName}-${match.index}` }, inner))
    else nodes.push(full)

    last = match.index + full.length
  }

  if (last < template.length) nodes.push(template.slice(last))
  return React.createElement(React.Fragment, null, ...nodes)
}
