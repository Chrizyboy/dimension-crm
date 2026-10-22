import { describe, expect, it } from 'vitest'
import type { Abwesenheit, Einsatz } from '../types'
import {
  alsDatum,
  alsIso,
  auslastung,
  balken,
  endeNachWerktagen,
  kalenderwoche,
  konflikte,
  monate,
  montag,
  naechsterWerktag,
  werktage,
  wochen,
} from './zeitplan'

const einsatz = (e: Partial<Einsatz>): Einsatz => ({
  id: 'e',
  projekt_id: 'p1',
  art: 'intern',
  von: '2026-10-19',
  bis: '2026-10-21',
  personen: [],
  subunternehmer_id: null,
  notiz: null,
  ...e,
})

const abwesend = (a: Partial<Abwesenheit>): Abwesenheit => ({
  id: 'a',
  person_id: 'anna',
  art: 'ferien',
  von: '2026-10-20',
  bis: '2026-10-20',
  halbtag: false,
  quelle: 'crm',
  ...a,
})

describe('Zeitplan', () => {
  it('rechnet Daten ohne Zeitzonen-Verschiebung', () => {
    expect(alsIso(alsDatum('2026-03-29'))).toBe('2026-03-29')
    expect(alsIso(montag(alsDatum('2026-10-25')))).toBe('2026-10-19')
  })

  it('kennt die Kalenderwoche nach ISO', () => {
    expect(kalenderwoche(alsDatum('2026-10-22'))).toBe(43)
    expect(kalenderwoche(alsDatum('2027-01-01'))).toBe(53)
    expect(kalenderwoche(alsDatum('2026-01-01'))).toBe(1)
  })

  it('zählt Werktage und überspringt das Wochenende', () => {
    expect(werktage('2026-10-23', '2026-10-26')).toBe(2)
    expect(endeNachWerktagen('2026-10-23', 3)).toBe('2026-10-27')
    expect(endeNachWerktagen('2026-10-23', 0)).toBe('2026-10-23')
    expect(alsIso(naechsterWerktag(alsDatum('2026-10-24')))).toBe('2026-10-26')
  })

  it('gruppiert Wochen nach Monat', () => {
    const w = wochen(alsDatum('2026-10-22'), 3)
    expect(w.map((x) => x.kw)).toEqual([43, 44, 45])
    expect(monate(w)).toEqual([
      { monat: 9, jahr: 2026, wochen: 2 },
      { monat: 10, jahr: 2026, wochen: 1 },
    ])
  })

  it('legt Balken in den sichtbaren Bereich und schneidet sie ab', () => {
    expect(balken('2026-10-19', '2026-10-20', '2026-10-19', 10)).toEqual({ links: 0, breite: 20 })
    expect(balken('2026-10-12', '2026-10-19', '2026-10-19', 10)).toEqual({ links: 0, breite: 10 })
    expect(balken('2026-11-30', '2026-12-01', '2026-10-19', 10)).toBeNull()
  })

  it('zählt Auslastung ohne «voraussichtlich» und findet Konflikte', () => {
    const w = wochen(alsDatum('2026-10-19'), 2)
    const a = auslastung(
      w,
      [
        einsatz({ personen: ['anna', 'ben'] }),
        einsatz({ projekt_id: 'p2', art: 'geplant' }),
        einsatz({ projekt_id: 'p3', von: '2026-10-26', bis: '2026-10-26', art: 'extern' }),
      ],
      [abwesend({})],
    )
    expect(a[0]).toEqual({ baustellen: ['p1'], personen: ['anna', 'ben'], abwesend: ['anna'] })
    expect(a[1]?.baustellen).toEqual(['p3'])
    expect(konflikte(einsatz({ personen: ['anna', 'ben'] }), [abwesend({})])).toEqual(['anna'])
  })
})
