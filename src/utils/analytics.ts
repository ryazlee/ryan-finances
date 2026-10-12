type GoatCounter = {
  count: (vars?: { path?: string }) => void
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

export function trackPageview(path = window.location.pathname): void {
  try {
    const safe = path.split('?')[0]?.split('#')[0] || '/'
    window.goatcounter?.count({ path: safe })
  } catch {
    // Analytics should never break the app.
  }
}
