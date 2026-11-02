import { describe, expect, it } from 'vitest'
import { dauerText, inDieserWoche, reaktion } from './reaktion'

const jetzt = new Date('2026-11-04T10:00:00+01:00')

describe('reaktion', () => {
  it('läuft bei neuen Fällen und zeigt die Restzeit', () => {
    expect(reaktion({ status: 'neu', reaktion_bis: '2026-11-04T15:48:00+01:00' }, jetzt)).toEqual({
      laeuft: true,
      ueberfaellig: false,
      minuten: 348,
    })
  })
  it('ist überfällig, wenn die Zeit um ist und noch kein Termin steht', () => {
    expect(reaktion({ status: 'bearbeitung', reaktion_bis: '2026-11-04T09:00:00+01:00' }, jetzt).ueberfaellig).toBe(
      true,
    )
  })
  it('läuft nicht mehr mit Termin, Teilen oder erledigt', () => {
    for (const status of ['termin', 'teile', 'erledigt'])
      expect(reaktion({ status, reaktion_bis: '2026-11-01T09:00:00+01:00' }, jetzt).laeuft).toBe(false)
  })
})

describe('dauerText', () => {
  it('schreibt Minuten, Stunden und Tage', () => {
    expect(dauerText(12)).toBe('12 min')
    expect(dauerText(348)).toBe('5 h 48 min')
    expect(dauerText(-3060)).toBe('2 T 3 h')
  })
})

describe('inDieserWoche', () => {
  it('Montag bis Sonntag der laufenden Woche', () => {
    expect(inDieserWoche('2026-11-02T08:00:00+01:00', jetzt)).toBe(true)
    expect(inDieserWoche('2026-11-08T20:00:00+01:00', jetzt)).toBe(true)
    expect(inDieserWoche('2026-11-09T08:00:00+01:00', jetzt)).toBe(false)
    expect(inDieserWoche(null, jetzt)).toBe(false)
  })
})
