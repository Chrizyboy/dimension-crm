import { describe, expect, it } from 'vitest'
import type { Artikel, Leistung } from '../types'
import { bausteinPositionen } from './bausteine'

const artikel = (id: string, kategorie: string, w: number | null, ek: number): Artikel =>
  ({ id, name: id, kategorie, leistungW: w, ekRappen: ek, marge: 0.25, skonto: 0.015, einheit: 'Stk', artikelnummer: id, gruppe: null }) as Artikel
const montage: Leistung = {
  id: 'l1',
  schluessel: 'montage_pv',
  nameDe: 'Montage PV',
  nameFr: 'Montage PV',
  einheit: 'Std.',
  kostenRappen: 6500,
  verkaufRappen: 9800,
  bereiche: ['kalkulation'],
  reihenfolge: 10,
}

describe('Bausteine', () => {
  it('rechnet Unterkonstruktion je Modul und Montage je kWp aus den gewählten Modulen', () => {
    const pos = bausteinPositionen(
      {
        zeilen: [
          { art: 'wahl', kategorie: 'module', regel: 'fest', faktor: 20 },
          { art: 'wahl', kategorie: 'unterkonstruktion', regel: 'je_modul', faktor: 1 },
          { art: 'leistung', leistung: 'montage_pv', regel: 'je_kwp', faktor: 4.1 },
        ],
      },
      {
        wahl: { 0: 'modul', 1: 'uk' },
        mengen: { 0: 22 },
        artikel: [artikel('modul', 'module', 485, 9232), artikel('uk', 'unterkonstruktion', null, 4650)],
        leistungen: [montage],
        bestehend: [],
        variante: 'A',
        sprache: 'de',
      },
    )
    expect(pos.map((p) => [p.name, p.menge])).toEqual([
      ['modul', 22],
      ['uk', 22],
      ['Montage PV', 43.7],
    ])
    expect(pos[2]?.preisRappen).toBe(9800)
    expect(pos[2]?.varianten).toEqual(['A'])
  })

  it('lässt Zeilen ohne Wahl weg', () => {
    const pos = bausteinPositionen(
      { zeilen: [{ art: 'wahl', kategorie: 'batteriespeicher', regel: 'fest', faktor: 1 }] },
      { wahl: {}, mengen: {}, artikel: [], leistungen: [], bestehend: [], variante: null, sprache: 'fr' },
    )
    expect(pos).toEqual([])
  })
})
