const KEY = 'finance-tracker-session'
const MAX_AGE = 60 * 60 * 24 * 30

function cookiePath(): string {
  return import.meta.env.BASE_URL.startsWith('/ryan-finances') ? '/ryan-finances' : '/'
}

function writeCookie(value: string, maxAge: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${KEY}=${value}; Max-Age=${maxAge}; Path=${cookiePath()}; SameSite=Lax${secure}`
}

export function readSession(): string {
  try {
    sessionStorage.removeItem('finance-tracker-google')
  } catch {
    // Older tabs stored a short-lived token here.
  }

  try {
    const saved = localStorage.getItem(KEY)?.trim() ?? ''
    if (/^[a-f0-9]{64}$/.test(saved)) return saved
  } catch {
    // Fall through to the cookie.
  }

  const prefix = `${KEY}=`
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  const value = match ? decodeURIComponent(match.slice(prefix.length)) : ''
  if (!/^[a-f0-9]{64}$/.test(value)) return ''
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // The cookie still restores this visit.
  }
  return value
}

export function writeSession(id: string) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // The cookie below is the other copy.
  }
  writeCookie(id, MAX_AGE)
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // The cookie clear still signs this browser out.
  }
  writeCookie('', 0)
}
