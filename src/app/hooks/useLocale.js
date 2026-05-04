import { useSyncExternalStore } from 'react'
import { subscribeToLanguage, getLanguageSnapshot } from '../localization/i18n.js'

export function useLocale() {
  return useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot)
}
