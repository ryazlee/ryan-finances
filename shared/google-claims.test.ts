import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { verifiedGoogleClaim, type GoogleIdClaims } from './google-claims.ts'

const clientId = 'client.apps.googleusercontent.com'
const allowed = 'ryan.j.lee99@gmail.com'
const now = 1_700_000_000

function claims(overrides: Partial<GoogleIdClaims> = {}): GoogleIdClaims {
  return {
    iss: 'https://accounts.google.com',
    aud: clientId,
    exp: now + 60,
    email: 'Ryan.J.Lee99@gmail.com',
    email_verified: true,
    ...overrides,
  }
}

describe('verifiedGoogleClaim', () => {
  it('returns the verified email', () => {
    assert.equal(verifiedGoogleClaim(claims(), clientId, now), allowed)
  })

  it('rejects bad audiences, expired tokens, and unverified emails', () => {
    assert.equal(verifiedGoogleClaim(claims({ aud: 'other-client' }), clientId, now), null)
    assert.equal(verifiedGoogleClaim(claims({ exp: now }), clientId, now), null)
    assert.equal(verifiedGoogleClaim(claims({ email_verified: false }), clientId, now), null)
    assert.equal(verifiedGoogleClaim(claims({ iss: 'https://evil.example' }), clientId, now), null)
  })
})
