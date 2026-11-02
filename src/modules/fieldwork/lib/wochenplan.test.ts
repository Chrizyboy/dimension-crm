import { describe, expect, it } from 'vitest'
import {
  auslastung,
  konflikteAm,
  konflikteGesamt,
  tageZwischen,
  wochenAnfang,
  wochenTage,
  type PlanEintrag,
  type Wochenplan,
} from './wochenplan'

const e = (x: Partial<PlanEintrag>): PlanEintrag => ({
  typ: 'montage',
  id: 'e',
  art: 'intern',
  von: '2026-11-09',
  bis: '2026-11-10',
  zeit: null,
  personen: ['a'],
  subunternehmer_id: null,
  projekt_id: 'p1',
  nummer: 'P1',
  titel: 'Muster',
  ort: 'Muri',
  ...x,
})
const plan = (x: Partial<Wochenplan>): Wochenplan => ({
  personen: [
    { id: 'a', name: 'A', kuerzel: 'A', rolle: 'montage' },
    { id: 'b', name: 'B', kuerzel: 'B', rolle: 'montage' },
  ],
  subunternehmer: [],
  eintraege: [],
  abwesenheiten: [],
  kurse: [],
  ...x,
})

describe('Wochenplan', () => {
  it('rechnet Wochen ab Montag', () => {
    expect(wochenTage(wochenAnfang(new Date('2026-11-12T10:00:00')))).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
    ])
    expect(tageZwischen('2026-11-09', '2026-11-12')).toBe(3)
  })

  it('meldet abwesend, doppelt und abgelaufenen Kurs', () => {
    const p = plan({
      eintraege: [e({}), e({ id: 's', typ: 'service', von: '2026-11-10', bis: '2026-11-10', projekt_id: 'p2' })],
      abwesenheiten: [{ person_id: 'a', art: 'ferien', von: '2026-11-09', bis: '2026-11-09', halbtag: false }],
      kurse: [{ person_id: 'a', art: 'absturz', gueltig_bis: '2026-11-09' }],
    })
    expect(konflikteAm(p, 'a', '2026-11-09')).toEqual(['abwesend'])
    expect(konflikteAm(p, 'a', '2026-11-10')).toEqual(['doppelt', 'kurs'])
    expect(konflikteAm(p, 'b', '2026-11-10')).toEqual([])
    expect(konflikteGesamt(p, ['2026-11-09', '2026-11-10'])).toBe(2)
  })

  it('Service am eigenen Projekt und «geplant» sind kein Konflikt', () => {
    const p = plan({
      eintraege: [
        e({}),
        e({ id: 's', typ: 'service', von: '2026-11-09', bis: '2026-11-09', projekt_id: 'p1' }),
        e({ id: 'g', art: 'geplant', projekt_id: 'p3' }),
      ],
    })
    expect(konflikteAm(p, 'a', '2026-11-09')).toEqual([])
  })

  it('Auslastung ohne Abwesenheiten', () => {
    const p = plan({
      eintraege: [e({ von: '2026-11-09', bis: '2026-11-09' })],
      abwesenheiten: [{ person_id: 'b', art: 'ferien', von: '2026-11-09', bis: '2026-11-10', halbtag: false }],
    })
    expect(auslastung(p, ['2026-11-09', '2026-11-10'])).toBe(50)
  })
})
