import { useEffect, useRef, useState } from 'react'
import { APP_TAGLINE } from '../../constants'
import { useTheme, type Theme } from '../../theme'
import { ApiError, api, setAccessToken } from '../../utils/api'
import { loadGoogleIdentity } from '../../utils/google'
import AppHeader from '../AppHeader'
import AppShell from '../AppShell'
import Button from '../Button'
import MakerCredit from '../MakerCredit'
import SectionCard from '../SectionCard'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

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
    const created = await api<{ session: string }>('/api/session', { method: 'POST' })
    onSignedIn(created.session)
  } catch (error) {
    setAccessToken('')
    setFailed(true)
    setMessage(error instanceof ApiError ? error.message : 'Could not save this sign-in.')
  }
}

function prepareGoogle(theme: Theme, onSignedIn: (token: string) => void, setMessage: (message: string | null) => void, setFailed: (failed: boolean) => void) {
  const googleId = window.google?.accounts.id
  if (!googleId) return null
  googleId.initialize({
    client_id: clientId,
    auto_select: false,
    color_scheme: theme,
    use_fedcm_for_prompt: true,
    callback: (response) => {
      void acceptCredential(response.credential, onSignedIn, setMessage, setFailed)
    },
  })
  return googleId
}

export default function LoginScreen({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const { theme } = useTheme()
  const buttonRef = useRef<HTMLDivElement>(null)
  const onSignedInRef = useRef(onSignedIn)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [showGoogleButton, setShowGoogleButton] = useState(false)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    onSignedInRef.current = onSignedIn
  }, [onSignedIn])

  useEffect(() => {
    const parent = buttonRef.current
    if (!showGoogleButton || !clientId || !parent) return
    let cancelled = false
    parent.replaceChildren()
    void loadGoogleIdentity()
      .then(() => {
        if (cancelled || !buttonRef.current) return
        const googleId = prepareGoogle(theme, onSignedInRef.current, setMessage, setFailed)
        googleId?.renderButton(buttonRef.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 240,
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
  }, [showGoogleButton, theme])

  function openAccountList() {
    setOpening(true)
    setMessage(null)
    setFailed(false)
    void loadGoogleIdentity()
      .then(() => {
        const googleId = prepareGoogle(theme, onSignedInRef.current, setMessage, setFailed)
        if (!googleId) throw new Error('Could not load Google sign-in.')
        googleId.prompt((moment) => {
          setOpening(false)
          if (moment.isDismissedMoment()) return
          if (moment.isNotDisplayed() || moment.isSkippedMoment()) {
            setShowGoogleButton(true)
            setFailed(true)
            setMessage('The account list did not open. Use the Google button below.')
          }
        })
      })
      .catch((error: unknown) => {
        setOpening(false)
        setFailed(true)
        setMessage(error instanceof Error ? error.message : 'Could not load Google sign-in.')
      })
  }

  return (
    <AppShell centered header={<AppHeader subtitle={APP_TAGLINE} />}>
      <SectionCard title="Sign in">
        <div className="stack">
          <p className="notice">This browser keeps you signed in. Only your Google account can open it.</p>
          {clientId ? (
            <Button
              label={opening ? 'Opening Google…' : 'Sign in with Google'}
              icon={<GoogleMark />}
              variant="secondary"
              block
              onClick={openAccountList}
              disabled={opening}
            />
          ) : (
            <p className="notice notice--error">Google sign-in is not configured yet.</p>
          )}
          {showGoogleButton ? <div className="google-button" ref={buttonRef} /> : null}
          {message ? <p className={failed ? 'notice notice--error' : 'notice'}>{message}</p> : null}
        </div>
      </SectionCard>
      <MakerCredit />
    </AppShell>
  )
}
