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

  useEffect(() => {
    setAccessToken(token)
    setUnauthorizedHandler(signOut)
  }, [signOut, token])

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
