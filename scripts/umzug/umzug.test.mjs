import { describe, expect, it } from 'vitest'
import { fehlendeFunktionen, istEuropa, secretsPruefen } from './umzug.mjs'

describe('Umzug: Prüfungen', () => {
  it('nennt fehlende Pflicht-Secrets, unvollständige Dienste und Test-Adressen', () => {
    const r = secretsPruefen([
      'ZEITPLAN_SCHLUESSEL',
      'MS_CLIENT_ID',
      'ABANINJA_TOKEN',
      'ABANINJA_KONTO',
      'ANTHROPIC_URL',
    ])
    expect(r.pflichtFehlt).toEqual(['VERBINDUNG_SCHLUESSEL', 'APP_URL'])
    expect(r.dienste.find((d) => d.dienst === 'Microsoft 365')?.fehlt).toEqual(['MS_TENANT_ID', 'MS_CLIENT_SECRET'])
    expect(r.dienste.find((d) => d.dienst === 'AbaNinja')?.fehlt).toEqual([])
    expect(r.testWerte).toEqual(['ANTHROPIC_URL'])
  })
  it('akzeptiert nur Regionen in Europa', () => {
    expect(istEuropa('eu-central-1')).toBe(true)
    expect(istEuropa('eu-central-2')).toBe(true)
    expect(istEuropa('us-east-1')).toBe(false)
    expect(istEuropa(undefined)).toBe(false)
  })
  it('findet Funktionen, die noch nicht hochgeladen sind', () => {
    expect(fehlendeFunktionen(['ki', 'sicherung', 'zeitplan'], ['ki', 'zeitplan'])).toEqual(['sicherung'])
  })
})
