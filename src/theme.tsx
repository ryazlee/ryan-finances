import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'finance-tracker-theme'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({
  theme: 'light',
  toggleTheme: () => {},
})

export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // Ignore storage failures and fall through to the system theme.
  }

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme)
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('theme-dark', theme === 'dark')
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#09090b' : '#fafafa')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => loadTheme())

  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
  }, [theme])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
