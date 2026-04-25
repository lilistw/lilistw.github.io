const THEME_KEY = 'theme'

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY)
}

export function storeTheme(value) {
  localStorage.setItem(THEME_KEY, value)
}

export function applyThemeAttribute(value) {
  document.documentElement.setAttribute('data-theme', value)
}
