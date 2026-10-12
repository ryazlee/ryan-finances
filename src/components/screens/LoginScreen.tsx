import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../../theme'
import { ApiError, api, setAccessToken } from '../../utils/api'
import { loadGoogleIdentity } from '../../utils/google'
import AppHeader from '../AppHeader'
import AppShell from '../AppShell'
import SectionCard from '../SectionCard'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''

async function acceptCredential(
  credential: string,
  onSignedIn: (token: string) => void,
  setMessage: (message: string | null) => void,
  setFailed: (failed: boolean) => void,
) {
  setMessage(null)
  setFailed(false)
  setAccessToken(credential)
  try {
    await api('/api/snapshot')
    onSignedIn(credential)
  } catch (error) {
    setAccessToken('')
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      setFailed(true)
      setMessage(error.message)
      return
    }
    onSignedIn(credential)
  }
}

export default function LoginScreen({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const { theme } = useTheme()
  const buttonRef = useRef<HTMLDivElement>(null)
  const onSignedInRef = useRef(onSignedIn)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    onSignedInRef.current = onSignedIn
  }, [onSignedIn])

  useEffect(() => {
    const parent = buttonRef.current
    if (!clientId || !parent) return
    let cancelled = false
    parent.replaceChildren()
    void loadGoogleIdentity()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          callback: (response) => {
            void acceptCredential(response.credential, onSignedInRef.current, setMessage, setFailed)
          },
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 280,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFailed(true)
        setMessage(error instanceof Error ? error.message : 'Could not load Google sign-in.')
      })
    return () => {
      cancelled = true
    }
  }, [theme])

  return (
    <AppShell header={<AppHeader subtitle="Private spend dashboard." />}>
      <div className="connect">
        <SectionCard title="Sign in">
          <div className="stack">
            <p className="notice">Only the Google account this tracker allows can open it.</p>
            {clientId ? <div className="google-button" ref={buttonRef} /> : (
              <p className="notice notice--error">Google sign-in is not configured yet.</p>
            )}
            {message ? <p className={failed ? 'notice notice--error' : 'notice'}>{message}</p> : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}
