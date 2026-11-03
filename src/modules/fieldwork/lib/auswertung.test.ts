import { describe, expect, it } from 'vitest'
import type { Auswertung, FertigeBaustelle } from '../types'
import { abweichung, auswertungZahlen, stundenProKwp } from './auswertung'

const b = (x: Partial<FertigeBaustelle>): FertigeBaustelle => ({
  projekt_id: 'p',
  nummer: 'P1',
  datum: '2026-10-01',
  kunde: null,
  ort: null,
  vorlage: 'pv',
  dachform: null,
  kwp: 10,
  soll: 45,
  ist: 50,
  reise: 4,
  meldungen: 0,
  ...x,
})

describe('auswertung', () => {
  it('rechnet Abweichung und h/kWp je Baustelle', () => {
    expect(abweichung(b({}))).toBe(11)
    expect(abweichung(b({ soll: null }))).toBeNull()
    expect(stundenProKwp(b({}))).toBe(5)
  })
  it('fasst den Zeitraum zusammen', () => {
    const a: Auswertung = {
      fertig: [b({}), b({ kwp: 20, soll: 90, ist: 80 }), b({ vorlage: 'waermepumpe', kwp: null, soll: 40, ist: 40 })],
      stunden: { arbeit: 170, reise: 30, auf_projekt: 170 },
      nachtraege: { anzahl: 1, rappen: 50000 },
      meldungen: {},
      rapporte: { anzahl: 10, gleicher_tag: 9, visiert: 5 },
    }
    expect(auswertungZahlen(a)).toEqual({
      fertig: 3,
      abweichung: -3,
      hProKwp: 4.33,
      reiseAnteil: 15,
      gleicherTag: 90,
      visiert: 50,
    })
  })
})
