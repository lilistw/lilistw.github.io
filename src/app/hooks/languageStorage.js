const LANGUAGE_KEY = 'language'

export function getStoredLanguage() {
  return localStorage.getItem(LANGUAGE_KEY)
}

export function storeLanguage(value) {
  localStorage.setItem(LANGUAGE_KEY, value)
}
