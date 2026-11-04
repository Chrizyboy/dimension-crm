import { describe, expect, it } from 'vitest'
import { datenAufruf, fehlendeFunktionen, istEuropa, secretsPruefen } from './umzug.mjs'

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

describe('Umzug: Daten übernehmen', () => {
  const gibt = (/** @type {string} */ p) => !p.includes('fehlt')
  it('gibt Ordnerliste, Korrekturen und Schalter an den Import weiter', () => {
    expect(
      datenAufruf(['E.zip', '--ablage', 'a.json', '--korrekturen', 'k.json', '--gebaut-bis', '2025'], gibt),
    ).toEqual({
      argumente: [
        'scripts/import/import-vorlage.mjs',
        'E.zip',
        '--umzug',
        '--bericht',
        'umzug-bericht.md',
        '--ablage',
        'a.json',
        '--korrekturen',
        'k.json',
        '--gebaut-bis',
        '2025',
      ],
    })
  })
  it('verlangt Ordnerliste und Korrekturen und prüft die Dateien', () => {
    expect(datenAufruf(['E.zip', '--ablage', 'a.json'], gibt)).toHaveProperty('fehler')
    expect(datenAufruf(['E.zip', '--ablage', 'fehlt.json', '--korrekturen', 'k.json'], gibt)).toHaveProperty('fehler')
    expect(datenAufruf(['E.zip', '--irgendwas'], gibt)).toHaveProperty('fehler')
    expect(datenAufruf(['fehlt.zip'], gibt)).toHaveProperty('fehler')
  })
})
