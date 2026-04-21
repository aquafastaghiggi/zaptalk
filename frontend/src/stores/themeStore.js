import { create } from 'zustand'

const STORAGE_KEY = 'zaptalk_theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem(STORAGE_KEY) || 'dark'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

const initialTheme = getInitialTheme()
applyTheme(initialTheme)

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    const nextTheme = theme === 'light' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
    set({ theme: nextTheme })
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
    set({ theme: nextTheme })
  },
}))
