type PlaidExitError = {
  display_message?: string | null
  error_message?: string | null
} | null

type PlaidHandler = {
  open: () => void
  destroy: () => void
}

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string
        onSuccess: (publicToken: string) => void
        onExit?: (error: PlaidExitError) => void
      }) => PlaidHandler
    }
  }
}

let loading: Promise<void> | null = null

export function loadPlaid(): Promise<void> {
  if (window.Plaid) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading = null
        reject(new Error('Could not load Plaid Link.'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

export function openPlaidLink(
  token: string,
  onSuccess: (publicToken: string) => void,
  onExit: (message: string | null) => void,
): void {
  const plaid = window.Plaid
  if (!plaid) {
    onExit('Plaid Link did not load.')
    return
  }
  let settled = false
  const handler = plaid.create({
    token,
    onSuccess: (publicToken) => {
      settled = true
      onSuccess(publicToken)
      handler.destroy()
    },
    onExit: (error) => {
      if (settled) return
      onExit(error?.display_message || error?.error_message || null)
      handler.destroy()
    },
  })
  handler.open()
}
