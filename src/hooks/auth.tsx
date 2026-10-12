import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import LoginScreen from '../components/screens/LoginScreen'
import { forgetSession, setAccessToken, setUnauthorizedHandler } from '../utils/api'
import { disableGoogleAutoSelect } from '../utils/google'
import { clearSession, readSession, writeSession } from '../utils/session'

type AuthContextValue = {
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readSession)

  const signOut = useCallback(() => {
    const current = readSession()
    disableGoogleAutoSelect()
    clearSession()
    setUnauthorizedHandler(() => {})
    setAccessToken('')
    setToken('')
    forgetSession(current)
  }, [])

  // The dashboard fetches as soon as it mounts. Put the saved session on
  // those requests before that, or a 401 clears the cookie.
  setAccessToken(token)
  setUnauthorizedHandler(token ? signOut : () => {})

  const value = useMemo(() => ({ signOut }), [signOut])

  if (!token) {
    return (
      <LoginScreen
        onSignedIn={(next) => {
          writeSession(next)
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
