export type GoogleIdClaims = {
  iss?: string
  aud?: string | string[]
  exp?: number
  email?: string
  email_verified?: boolean | string
}

const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])

export function verifiedGoogleClaim(
  claims: GoogleIdClaims,
  clientId: string,
  nowSec: number,
): string | null {
  if (!clientId || !claims.iss || !ISSUERS.has(claims.iss)) return null
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : []
  if (!audiences.includes(clientId)) return null
  if (typeof claims.exp !== 'number' || claims.exp <= nowSec) return null
  const verified = claims.email_verified === true || claims.email_verified === 'true'
  if (!verified || !claims.email) return null
  return claims.email.trim().toLowerCase()
}
