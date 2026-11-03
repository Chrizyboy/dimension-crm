import { describe, expect, it } from 'vitest'
import { einsatzTag, erledigteSchluessel, fehlendeFotos, fortschritt, naechsteSchritte, schritteText } from './schritte'

const S = [
  { schluessel: 'sicherheit', de: 'Gerüst', fr: 'Échafaudage' },
  { schluessel: 'module', de: 'Module verlegt', fr: 'Modules posés' },
  { schluessel: 'dc', de: 'DC-Verkabelung', fr: 'Câblage DC' },
]

describe('Arbeitsschritte', () => {
  it('zählt Früheres und Heutiges zusammen', () => {
    const e = erledigteSchluessel({ sicherheit: '2026-11-02' }, { module: true, dc: false })
    expect([...e].sort()).toEqual(['module', 'sicherheit'])
    expect(fortschritt(S, e)).toBe(67)
    expect(naechsteSchritte(S, e)).toEqual([S[2]])
  })

  it('schreibt den Rapport-Text in der Sprache der Person', () => {
    expect(schritteText(S, { sicherheit: true, dc: true }, 'fr')).toBe('Échafaudage, Câblage DC')
    expect(schritteText(S, {}, 'de')).toBe('')
  })

  it('findet fehlende Pflichtfotos', () => {
    expect(fehlendeFotos(S, ['module']).map((f) => f.schluessel)).toEqual(['sicherheit', 'dc'])
  })

  it('rechnet Tag x von y', () => {
    expect(einsatzTag('2026-11-02', '2026-11-04', '2026-11-03')).toEqual({ nr: 2, von: 3 })
  })
})
