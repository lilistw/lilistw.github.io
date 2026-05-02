import { useState, useEffect } from 'react'
import { getStoredTheme, storeTheme, applyThemeAttribute } from './themeStorage.js'

export function useThemeMode() {
  const [nightMode, setNightMode] = useState(
    () => getStoredTheme() === 'night'
  )

  useEffect(() => {
    const value = nightMode ? 'night' : 'day'
    applyThemeAttribute(value)
    storeTheme(value)
  }, [nightMode])

  return [nightMode, setNightMode]
}
