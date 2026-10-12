export type GoogleCredentialResponse = {
  credential: string
}

export type PromptMoment = {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
}

type GoogleId = {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    auto_select?: boolean
    color_scheme?: 'light' | 'dark'
    use_fedcm_for_prompt?: boolean
  }) => void
  prompt: (listener?: (moment: PromptMoment) => void) => void
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let loading: Promise<void> | null = null

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      reject(new Error('Could not load Google sign-in.'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export function disableGoogleAutoSelect() {
  window.google?.accounts.id.disableAutoSelect()
}

export function tokenStillValid(token: string): boolean {
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    const claims = JSON.parse(atob(padded + pad)) as { exp?: number }
    return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now() + 30_000
  } catch {
    return false
  }
}
