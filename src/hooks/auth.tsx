import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import LoginScreen from '../components/screens/LoginScreen'
import { setAccessToken, setUnauthorizedHandler } from '../utils/api'
import { disableGoogleAutoSelect, tokenStillValid } from '../utils/google'

const TOKEN_KEY = 'finance-tracker-google'

type AuthContextValue = {
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readToken(): string {
  try {
    const saved = sessionStorage.getItem(TOKEN_KEY) ?? ''
    if (saved && tokenStillValid(saved)) return saved
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore storage failures and require a fresh sign-in.
  }
  return ''
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readToken)

  const signOut = useCallback(() => {
    disableGoogleAutoSelect()
    try {
      sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      // The in-memory token still clears below.
    }
    setAccessToken('')
    setToken('')
  }, [])

  useEffect(() => {
    setAccessToken(token)
    setUnauthorizedHandler(signOut)
  }, [signOut, token])

  const value = useMemo(() => ({ signOut }), [signOut])

  if (!token) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          try {
            sessionStorage.setItem(TOKEN_KEY, next)
          } catch {
            // The session still lasts until this tab reloads.
          }
          setToken(next)
        }}
      />
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
