import { describe, expect, it } from 'vitest'
import type { Dossier } from '../types'
import { naechsteFrist, verteile } from './board'
import { arbeitstageZurueck, fristenplan, wochenbeginn } from './fristen'
import { schritte } from './schritte'

const basis = {
  id: 'x',
  spur: 'angebot',
  status: 'kalkulation',
  art: 'ausschreibung',
  prioritaet: 'A',
  frist_fragen: null,
  frist_begehung: null,
  frist_eingabe: '2026-11-27T11:00:00Z',
  frist: '2026-11-27',
  frist_oeffnung: null,
  zuschlag_erwartet: null,
  beschwerde_bis: null,
  pruefung_am: null,
  checkliste: {},
  gng_entscheid: 'go',
  gng_am: '2026-11-02T10:00:00Z',
  angebot_rappen: null,
  anbieter_anzahl: null,
  ohne_protokoll: null,
  eingereicht_am: null,
  entscheid_datum: null,
  publiziert_am: '2026-10-28',
  erstellt_am: '2026-10-28T06:52:00Z',
  wiedervorlage_am: null,
  ausloeser_am: null,
} as unknown as Dossier

describe('Fristen', () => {
  it('rechnet Arbeitstage rückwärts über das Wochenende', () => {
    expect(arbeitstageZurueck('2026-11-30', 2)).toBe('2026-11-26')
    expect(arbeitstageZurueck('2026-11-27', 3)).toBe('2026-11-24')
  })
  it('findet den Montag einer Woche', () => {
    expect(wochenbeginn('2026-11-05')).toBe('2026-11-02')
    expect(wochenbeginn('2026-11-08')).toBe('2026-11-02')
  })
  it('plant Prüfung und Post vor der Eingabe, solange sie offen sind', () => {
    const plan = fristenplan([basis], { von: '2026-11-01', postTage: 2 })
    expect(plan.map((f) => `${f.art} ${f.am.slice(0, 10)}`)).toEqual([
      'pruefung 2026-11-24',
      'post 2026-11-25',
      'eingabe 2026-11-27',
    ])
    const geprueft = { ...basis, pruefung_am: '2026-11-20', checkliste: { versand: { am: 'x', von: null } } }
    expect(fristenplan([geprueft], { von: '2026-11-01' }).map((f) => f.art)).toEqual(['eingabe'])
  })
})

describe('Board', () => {
  it('zeigt die nächste offene Frist', () => {
    const d = { ...basis, frist_fragen: '2000-01-01', frist_begehung: '2099-01-01T10:00:00Z' }
    expect(naechsteFrist(d)?.art).toBe('begehung')
  })
  it('verteilt nach Spalten', () => {
    const spalten = verteile([basis, { ...basis, id: 'y', status: 'pruefen' }], 'angebot')
    expect(spalten.map((s) => s.karten.length)).toEqual([1, 1, 0, 0])
  })
})

describe('Schritte', () => {
  it('Go ist erledigt, die Prüfung ist offen', () => {
    const s = schritte(basis)
    expect(s.find((x) => x.id === 'gng')?.fertig).toBe(true)
    expect(s.find((x) => !x.fertig)?.id).toBe('kalkulation')
  })
})
