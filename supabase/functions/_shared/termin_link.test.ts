import { describe, expect, it } from 'vitest'
import { gleich, terminAnfrage } from './termin_link'

const T = 'abcdefghijklmnopqrstuvwx'

describe('terminAnfrage', () => {
  it('nimmt Zeiten mit gültigem Schlüssel', () => {
    expect(terminAnfrage({ aktion: 'zeiten', t: T })).toEqual({ art: 'zeiten', t: T })
  })
  it('lehnt kurze oder fremde Schlüssel ab', () => {
    expect(terminAnfrage({ aktion: 'zeiten', t: 'kurz' }).art).toBe('fehler')
    expect(terminAnfrage({ aktion: 'zeiten', t: `${T}' or 1=1` }).art).toBe('fehler')
  })
  it('braucht beim Buchen eine Zeit und kürzt die Notiz', () => {
    expect(terminAnfrage({ aktion: 'buchen', t: T, beginn: 'morgen' })).toEqual({ art: 'fehler', fehler: 'beginn' })
    const r = terminAnfrage({ aktion: 'buchen', t: T, beginn: '2026-11-05T13:00:00Z', notiz: 'x'.repeat(900) })
    expect(r.art === 'buchen' && r.beginn).toBe('2026-11-05T13:00:00.000Z')
    expect(r.art === 'buchen' && r.notiz?.length).toBe(500)
  })
  it('kennt nur zwei Aktionen', () => {
    expect(terminAnfrage({ aktion: 'loeschen', t: T })).toEqual({ art: 'fehler', fehler: 'aktion' })
  })
})

describe('gleich', () => {
  it('vergleicht Texte', () => {
    expect(gleich('abc', 'abc')).toBe(true)
    expect(gleich('abc', 'abd')).toBe(false)
    expect(gleich('abc', 'ab')).toBe(false)
  })
})
