import { describe, expect, it } from 'vitest'
import { anmeldefehlerVon } from './anmeldung'

describe('Fehler bei der Anmeldung', () => {
  it('erkennt die Abweisung durch die Datenbank (nicht erfasste Adresse)', () => {
    expect(anmeldefehlerVon({ status: 403, message: 'Diese E-Mail-Adresse ist im CRM nicht freigeschaltet.' })).toBe(
      'nicht_freigeschaltet',
    )
  })

  it('erkennt falsche oder abgelaufene Codes', () => {
    expect(anmeldefehlerVon({ status: 403, message: 'Token has expired or is invalid', code: 'otp_expired' })).toBe(
      'code_falsch',
    )
  })

  it('erkennt zu viele Versuche', () => {
    expect(anmeldefehlerVon({ status: 429, message: 'rate limit' })).toBe('zu_oft')
  })
})
