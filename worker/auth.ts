import { verifiedGoogleClaim, type GoogleIdClaims } from '../shared/google-claims'
import type { Env } from './env'

const ALLOWED_EMAIL = 'ryan.j.lee99@gmail.com'

type Cert = JsonWebKey & { kid?: string }

let certsCache: { keys: Cert[]; exp: number } | null = null

export function allowedEmail(env: Env): string {
  return (env.ALLOWED_EMAIL?.trim() || ALLOWED_EMAIL).toLowerCase()
}

export async function verifiedGoogleEmail(request: Request, clientId: string): Promise<string | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [encodedHeader, encodedPayload, encodedSignature] = parts
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null

  let headerJson: { alg?: string; kid?: string }
  let claims: GoogleIdClaims
  try {
    headerJson = JSON.parse(new TextDecoder().decode(decodePart(encodedHeader))) as { alg?: string; kid?: string }
    claims = JSON.parse(new TextDecoder().decode(decodePart(encodedPayload))) as GoogleIdClaims
  } catch {
    return null
  }
  if (headerJson.alg !== 'RS256' || !headerJson.kid) return null

  const key = (await googleCerts()).find((cert) => cert.kid === headerJson.kid)
  if (!key?.n || !key.e) return null
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: key.kty, n: key.n, e: key.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    decodePart(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  )
  if (!valid) return null
  return verifiedGoogleClaim(claims, clientId, Math.floor(Date.now() / 1000))
}

function decodePart(part: string): Uint8Array {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function googleCerts(): Promise<Cert[]> {
  if (certsCache && certsCache.exp > Date.now()) return certsCache.keys
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs')
  if (!response.ok) throw new Error('Could not load Google sign-in keys.')
  const body = (await response.json()) as { keys?: Cert[] }
  const keys = body.keys ?? []
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 3600)
  certsCache = { keys, exp: Date.now() + maxAge * 1000 }
  return keys
}
