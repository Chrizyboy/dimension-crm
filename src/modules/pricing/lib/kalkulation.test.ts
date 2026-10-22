import { describe, expect, it } from 'vitest'
import type { KalkPosition } from '../types'
import { aktualisierePreise, dbTon, mitVorlage, summe, werteFuerOfferte, zeile } from './kalkulation'

const pos = (p: Partial<KalkPosition>): KalkPosition => ({
  key: p.name ?? 'x',
  artikelId: null,
  artikelnummer: '',
  name: 'x',
  kategorie: 'module',
  gruppe: '',
  wp: null,
  einheit: 'Stk',
  menge: 1,
  ekRappen: 0,
  marge: 0.25,
  skonto: 0.015,
  ...p,
})

describe('Kalkulation', () => {
  const module = pos({ name: 'Modul 440', wp: 440, menge: 20, ekRappen: 10000 })
  const wr = pos({
    name: 'SUN2000-10KTL',
    kategorie: 'wechselrichter',
    menge: 1,
    ekRappen: 150000,
    marge: 0.2,
    skonto: 0,
  })
  const montage = pos({ name: 'Montage', kategorie: 'arbeit', menge: 16, ekRappen: 0, marge: 0, skonto: 0, frei: true })

  it('rechnet eine Zeile wie V233 (EK × Marge × Skonto)', () => {
    expect(zeile(module).preis).toBeCloseTo(12687.5)
    expect(zeile(module).total).toBeCloseTo(253750)
  })

  it('summiert mit Rabatt, MWST, kWp und DB', () => {
    const s = summe({ positionen: [module, wr, montage], rabattProzent: 5 }, 8.1)
    expect(s.ek).toBe(350000)
    expect(s.brutto).toBe(433750)
    expect(s.rabattBetrag).toBe(21688)
    expect(s.netto).toBe(412062)
    expect(s.mwst).toBe(33377)
    expect(s.total).toBe(445440)
    expect(s.kwp).toBe(8.8)
    expect(s.module).toBe(20)
    expect(dbTon(s.dbProzent)).toBe('warnung')
  })

  it('übernimmt Betrag exkl. MWST und Namen in die Offerte', () => {
    const w = werteFuerOfferte(
      { id: null, titel: '', offerteId: null, rabattProzent: 0, notiz: '', positionen: [module, { ...wr, menge: 2 }] },
      8.1,
    )
    expect(w).toEqual({
      betrag_rappen: 613750,
      leistung_kwp: 8.8,
      anzahl_module: 20,
      wechselrichter: '2× SUN2000-10KTL',
    })
  })

  it('setzt Positionen auf die Preisliste', () => {
    const [neu, n] = aktualisierePreise(
      [{ ...module, artikelId: 'a1' }],
      [{ id: 'a1', name: 'Modul 440 neu', ekRappen: 9000, marge: 0.25, skonto: 0.015, leistungW: 440 } as never],
    )
    expect(n).toBe(1)
    expect(neu[0]?.ekRappen).toBe(9000)
  })

  it('bewertet den DB', () => {
    expect(dbTon(12)).toBe('warnung')
    expect(dbTon(11.9)).toBe('kritisch')
  })

  it('lädt Vorlagen und zählt fehlende Artikel', () => {
    const a1 = {
      id: 'a1',
      name: 'Haken',
      kategorie: 'unterkonstruktion',
      einheit: 'Stk',
      ekRappen: 500,
      marge: 0.3,
      skonto: 0.015,
      leistungW: null,
      artikelnummer: 'H1',
      gruppe: 'K2',
    } as never
    const [neu, fehlt] = mitVorlage(
      [{ ...module, artikelId: 'a1', menge: 2 }],
      {
        id: 'v',
        name: 'K2',
        system: null,
        positionen: [
          { artikelId: 'a1', menge: 10 },
          { artikelId: 'weg', menge: 1 },
        ],
      },
      [a1],
    )
    expect(neu).toHaveLength(1)
    expect(neu[0]?.menge).toBe(12)
    expect(fehlt).toBe(1)
  })
})
