import { describe, expect, it } from 'vitest'
import type { Fakt, KennzahlenEinstellungen } from '../types'
import { berichtZeilen, monatsGrenzen, vormonat } from './bericht'
import { reaktionQuote, rechnungenNachAlter, ueberfaellig } from './betrieb'
import { alsCsv } from './csv'
import { hinweise } from './hinweise'
import { startReiter } from './rolle'
import { alterKlassen, mittelTage, pipelineNachStand, produktmix, rangliste, trichter, veraenderung } from './verkauf'
import { montagVon, tageZwischen, vergleichVon, vonBis, vorjahr } from './zeitraum'
import { STANDARD_EINSTELLUNGEN, erreicht, mitStandard, zielFuer, zielTon } from './ziele'

const f = (schluessel: string, extra: Partial<Fakt> = {}): Fakt => ({
  schluessel,
  art: 'offerte',
  id: Math.random().toString(36),
  datum: '2026-10-20',
  standort: 'muri',
  person_id: null,
  betrag_rappen: null,
  quelle: null,
  name: null,
  nummer: null,
  ort: null,
  stand: null,
  ...extra,
})

const mitZiel: KennzahlenEinstellungen = {
  ...STANDARD_EINSTELLUNGEN,
  ziele: { '2026': { muri: 365_000_00, bulle: 365_000_00, umsatz: 500_000_00, personen: { loris: 73_000_00 } } },
}

describe('Zeitraum (Ausbau)', () => {
  it('kennt Woche, Vorjahr und Vorperiode', () => {
    expect(montagVon('2026-11-05')).toBe('2026-11-02')
    expect(vonBis('woche', '2026-11-05')).toEqual({ von: '2026-11-02', bis: '2026-11-05' })
    expect(vorjahr('2028-02-29')).toBe('2027-02-28')
    expect(tageZwischen('2026-01-01', '2026-12-31')).toBe(365)
    expect(vergleichVon('monat', 'vorjahr', '2026-10-01', '2026-10-31')).toEqual({
      von: '2025-10-01',
      bis: '2025-10-31',
    })
    expect(vergleichVon('monat', 'vorperiode', '2026-10-01', '2026-10-31')).toEqual({
      von: '2026-08-31',
      bis: '2026-09-30',
    })
    expect(vergleichVon('alle', 'vorjahr', '2000-01-01', '2026-10-31')).toBeNull()
  })
})

describe('Ziele', () => {
  it('rechnet Jahresziele anteilig nach Tagen', () => {
    // 10 Tage von 365 → 10'000 Franken je Firma
    expect(zielFuer(mitZiel, { art: 'bereich', bereich: 'muri' }, '2026-01-01', '2026-01-10')).toBe(10_000_00)
    expect(zielFuer(mitZiel, { art: 'bereich', bereich: 'alle' }, '2026-01-01', '2026-01-10')).toBe(20_000_00)
    expect(zielFuer(mitZiel, { art: 'person', id: 'loris' }, '2026-01-01', '2026-12-31')).toBe(73_000_00)
    expect(zielFuer(mitZiel, { art: 'umsatz' }, '2026-01-01', '2026-12-31')).toBe(500_000_00)
  })

  it('gibt kein halbes Ziel, wenn ein Jahr fehlt', () => {
    expect(zielFuer(mitZiel, { art: 'bereich', bereich: 'muri' }, '2025-12-01', '2026-01-31')).toBeNull()
    expect(zielFuer(mitZiel, { art: 'person', id: 'filipe' }, '2026-01-01', '2026-01-31')).toBeNull()
  })

  it('bewertet den Zielstand', () => {
    expect(erreicht(95, 100)).toBe(95)
    expect(erreicht(5, null)).toBeNull()
    expect(zielTon(100)).toBe('ok')
    expect(zielTon(92)).toBe('warnung')
    expect(zielTon(50)).toBe('kritisch')
    expect(zielTon(null)).toBe('neutral')
    expect(mitStandard({ alt_tage: 60 }).wahrscheinlichkeit.offeriert).toBe(35)
  })
})

describe('Verkauf', () => {
  it('rechnet Veränderung, Tage und Trichter', () => {
    expect(veraenderung(120, 100)).toBe(20)
    expect(veraenderung(120, 0)).toBeNull()
    expect(mittelTage([f('ibn', { tage: 50 }), f('ibn', { tage: 61 }), f('ibn')])).toBe(55.5)
    const tr = trichter([
      f('leads_neu'),
      f('leads_neu'),
      f('leads_neu'),
      f('leads_neu'),
      f('quelle_termin'),
      f('quelle_auftrag'),
    ])
    expect(tr.stufen.map((s) => s.anteil)).toEqual([100, 25, 0, 25])
  })

  it('zählt Produkte je Auftrag', () => {
    const mix = produktmix([f('auftrag', { zusatz: 'pv,batterie' }), f('auftrag', { zusatz: 'pv' })])
    expect(mix.find((m) => m.produkt === 'pv')?.anteil).toBe(100)
    expect(mix.find((m) => m.produkt === 'batterie')?.anteil).toBe(50)
  })

  it('gewichtet die Pipeline je Stand und erkennt alte Offerten', () => {
    const offen = [
      f('offen', { betrag_rappen: 100_000_00, datum: '2026-10-01' }),
      f('offen', { betrag_rappen: 50_000_00, datum: '2026-10-01', stand: 'nachfassen' }),
      f('offen', { betrag_rappen: 40_000_00, datum: '2026-01-01', stand: 'nachfassen' }),
    ]
    const p = pipelineNachStand(offen, STANDARD_EINSTELLUNGEN, '2026-11-02')
    expect(p.find((s) => s.id === 'offeriert')?.gewichtet).toBe(35_000_00)
    expect(p.find((s) => s.id === 'nachfassen')?.gewichtet).toBe(10_000_00)
    expect(p.find((s) => s.id === 'alt')?.fakten).toHaveLength(1)
    expect(alterKlassen(offen, '2026-11-02').find((k) => k.id === 'a60')?.muri).toHaveLength(2)
  })

  it('macht die Rangliste nach Auftragseingang', () => {
    const fakten = [
      f('angenommen', { person_id: 'a', betrag_rappen: 10 }),
      f('angenommen', { person_id: 'b', betrag_rappen: 30 }),
      f('verloren', { person_id: 'b' }),
    ]
    const r = rangliste(fakten, [{ id: 'a' }, { id: 'b' }, { id: 'c' }], (id) => (id === 'a' ? 20 : null))
    expect(r.map((z) => z.id)).toEqual(['b', 'a'])
    expect(r[0]?.quote).toBe(50)
  })
})

describe('Finanzen und Service', () => {
  it('ordnet offene Rechnungen nach Alter', () => {
    const offen = [
      f('rechnung_offen', { tage: -5, betrag_rappen: 1 }),
      f('rechnung_offen', { tage: 45, betrag_rappen: 2 }),
    ]
    expect(rechnungenNachAlter(offen).map((k) => k.betrag)).toEqual([1, 0, 2, 0])
    expect(ueberfaellig(offen)).toHaveLength(1)
  })

  it('rechnet die Reaktionsquote nur über entschiedene Fälle', () => {
    const r = reaktionQuote([
      f('fall_neu', { zusatz: 'pv|ok' }),
      f('fall_neu', { zusatz: 'pv|spaet' }),
      f('fall_neu', { zusatz: 'pv|offen' }),
    ])
    expect(r.prozent).toBe(50)
  })
})

describe('Hinweise', () => {
  it('zeigt Kritisches zuerst und begrenzt die Liste', () => {
    const fakten = [
      ...Array.from({ length: 5 }, () => f('nf_faellig', { standort: 'bulle' })),
      f('rechnung_offen', { tage: 10, betrag_rappen: 5 }),
      f('ibn', { tage: 90 }),
    ]
    const h = hinweise(fakten, STANDARD_EINSTELLUNGEN, '2026-11-02', 80)
    expect(h[0]?.ton).toBe('kritisch')
    expect(h.map((x) => x.id)).toEqual(expect.arrayContaining(['nachfassen', 'ueberfaellig', 'ibn', 'zielKnapp']))
    expect(hinweise(fakten, STANDARD_EINSTELLUNGEN, '2026-11-02', 80, 2)).toHaveLength(2)
  })
})

describe('Monatsbericht, CSV, Startreiter', () => {
  it('kennt Monatsgrenzen und Vormonat', () => {
    expect(monatsGrenzen('2028-02')).toEqual({ von: '2028-02-01', bis: '2028-02-29' })
    expect(vormonat('2026-01-01')).toBe('2025-12')
  })

  it('zeigt Finanzzeilen nur mit Recht', () => {
    const ohne = berichtZeilen([], [], mitZiel, '2026-10', '2026-11-01', false)
    const mit = berichtZeilen([f('umsatz', { betrag_rappen: 100 })], [], mitZiel, '2026-10', '2026-11-01', true)
    expect(ohne.map((z) => z.id)).not.toContain('umsatz')
    expect(mit.map((z) => z.id)).toContain('umsatz')
    expect(mit.find((z) => z.id === 'auftraege')?.ziel).not.toBe('–')
  })

  it('schreibt CSV mit Semikolon und Franken', () => {
    const csv = alsCsv([f('angenommen', { nummer: 'OF-1', name: 'Muster "AG"', betrag_rappen: 1250000 })], ['a', 'b'])
    expect(csv.startsWith('﻿"a";"b"')).toBe(true)
    expect(csv).toContain('"Muster ""AG"""')
    expect(csv).toContain('"12500.00"')
  })

  it('wählt den Startreiter nach Rolle', () => {
    expect(startReiter({ rolle: 'buchhaltung', rechte: [] })).toBe('finanzen')
    expect(startReiter({ rolle: 'verkauf', rechte: [] })).toBe('verkauf')
    expect(startReiter({ rolle: 'monteur', rechte: [] })).toBe('abwicklung')
    expect(startReiter({ rolle: 'admin', rechte: ['finanzen'] })).toBe('ueberblick')
  })
})
