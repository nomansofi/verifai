import { getUiPrefs, setUiPrefs } from './verifaiDb.js'

const STORAGE_KEY = 'verifai_ui_prefs'

function systemPrefersDark() {
  if (typeof window === 'undefined') return true
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches)
}

export function getStoredTheme() {
  const prefs = getUiPrefs?.() ?? {}
  const t = prefs?.theme
  return t === 'light' || t === 'dark' ? t : null
}

export function getEffectiveTheme() {
  return getStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
}

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
  return t
}

export function setTheme(theme) {
  const t = applyTheme(theme)
  setUiPrefs({ theme: t })
  return t
}

export function initTheme() {
  // If user has no stored preference, follow system preference live.
  const stored = getStoredTheme()
  applyTheme(getEffectiveTheme())

  if (!stored && typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(getEffectiveTheme())
    try {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    } catch {
      // Safari fallback
      mql.addListener(onChange)
      return () => mql.removeListener(onChange)
    }
  }
  // eslint-disable-next-line no-unused-vars
  return () => {}
}

