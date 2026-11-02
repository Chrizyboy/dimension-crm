import { describe, expect, it } from 'vitest'
import type { KalkPosition } from '../types'
import {
  aktualisierePreise,
  dbTon,
  foerderung,
  freigabeGruende,
  mengeAusRegel,
  mengenNeu,
  mitVorlage,
  summe,
  werteFuerOfferte,
  zeile,
} from './kalkulation'

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

describe('Kalkulation mit Leistungen, Varianten und Regeln', () => {
  const modul = pos({ name: 'Aiko 485', wp: 485, menge: 22, ekRappen: 9232 })
  const speicher = pos({
    artikelId: 'sp',
    name: 'LUNA 10',
    kategorie: 'batteriespeicher',
    ekRappen: 415000,
    marge: 0.18,
    varianten: ['B'],
  })
  const montage = pos({
    name: 'Montage PV',
    kategorie: 'dienstleistungen',
    einheit: 'Std.',
    menge: 44,
    ekRappen: 6500,
    preisRappen: 9800,
    leistung: 'montage_pv',
    regel: { regel: 'je_kwp', faktor: 4.1 },
  })

  it('rechnet Leistungen mit festem Preis und Kosten', () => {
    expect(zeile(montage).total).toBe(431200)
    expect(zeile(montage).ekTotal).toBe(286000)
  })

  it('zählt nur Positionen der gewählten Variante', () => {
    const k = { positionen: [modul, speicher, montage], rabattProzent: 0 }
    expect(summe({ ...k, variante: null }, 8.1).brutto - summe({ ...k, variante: 'A' }, 8.1).brutto).toBeCloseTo(
      497046,
      -1,
    )
  })

  it('rechnet Mengen nach Regel neu', () => {
    const [neu, n] = mengenNeu({ positionen: [{ ...modul, menge: 24 }, montage] })
    expect(n).toBe(1)
    expect(neu[1]?.menge).toBe(47.7)
    expect(mengeAusRegel({ regel: 'je_modul', faktor: 1 }, { module: 22, kwp: 10.67 }, true)).toBe(22)
  })

  it('verlangt eine Freigabe bei Rabatt über der Grenze oder zu tiefer Marge', () => {
    const regeln = {
      kategorien: { batteriespeicher: { marge: 0.18, mindest: 0.12 } },
      rabatt_frei_prozent: 8,
      mindest_db_prozent: 15,
    }
    const k = { positionen: [modul, speicher, montage], variante: 'B' }
    expect(freigabeGruende({ ...k, rabattProzent: 3 }, regeln, 8.1)).toEqual([])
    expect(freigabeGruende({ ...k, rabattProzent: 9 }, regeln, 8.1)).toEqual(['rabatt'])
    expect(
      freigabeGruende({ ...k, rabattProzent: 0, positionen: [{ ...speicher, marge: 0.1 }] }, regeln, 8.1),
    ).toContain('marge')
  })

  it('schätzt die Förderung nach Tarif', () => {
    const f = {
      name: 'EIV',
      stand: '2026',
      grund_rappen: 0,
      je_kwp_rappen: 36000,
      bis_kwp: 30,
      je_kwp_darueber_rappen: 30000,
    }
    expect(foerderung(10, f)).toBe(360000)
    expect(foerderung(40, f)).toBe(1380000)
  })
})
