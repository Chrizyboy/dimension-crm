import { describe, expect, it } from 'vitest'
import type { WochenPerson, WochenTag } from '../types'
import { pflichtPause, warnungen, wochenIst, wochenSoll } from './arbeitsgesetz'

const tag = (t: string, x: Partial<WochenTag> = {}): WochenTag => ({
  tag: t,
  stunden: 0,
  pause_min: 0,
  laeuft: false,
  ungeprueft: 0,
  abwesenheit: null,
  einsatz: false,
  ...x,
})

const person = (tage: WochenTag[], saldo = 0): WochenPerson => ({
  person_id: 'p',
  name: 'Marco',
  kuerzel: 'MB',
  standort_id: null,
  pensum: 100,
  tage,
  saldo_jahr: saldo,
  bestaetigt_am: null,
})

describe('Arbeitsgesetz', () => {
  it('verlangt Pausen nach Dauer', () => {
    expect(pflichtPause(5, 0)).toBe(0)
    expect(pflichtPause(6, 0)).toBe(15)
    expect(pflichtPause(8, 30)).toBe(30)
    expect(pflichtPause(9, 30)).toBe(60)
  })

  it('warnt bei fehlender Pause, zu langem Tag, fehlendem Stempel und Saldo', () => {
    const p = person(
      [
        tag('2026-11-02', { stunden: 11.4, pause_min: 0 }),
        tag('2026-11-03', { einsatz: true }),
        tag('2026-11-04', { einsatz: true }),
      ],
      58,
    )
    expect(warnungen(p, '2026-11-04').map((w) => w.art)).toEqual(['pause', 'zu_lang', 'nicht_gestempelt', 'saldo'])
  })

  it('rechnet Soll nach Pensum, Ferien zählen als erfüllt', () => {
    const tage = ['02', '03', '04', '05', '06', '07', '08'].map((d) => tag(`2026-11-${d}`, { stunden: 8.5 }))
    tage[0] = tag('2026-11-02', { abwesenheit: { art: 'ferien', halbtag: false } })
    expect(wochenSoll({ ...person(tage), pensum: 80 })).toBe(27.2)
    expect(wochenIst(person(tage))).toBe(51)
  })
})
