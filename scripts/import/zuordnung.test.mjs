import { describe, expect, it } from 'vitest'
import { Zuordner } from './zuordner.mjs'
import { erstelleBericht } from './bericht.mjs'
import { baueKontakt } from './schritte/kunden.mjs'

const werte = [
  { liste: 'verkaufsstufe', schluessel: 'kein_interesse', eigenschaften: { vorlage: ['Kunde kein Interesse'] } },
  { liste: 'verkaufsstufe', schluessel: 'neu', eigenschaften: { vorlage: ['Neu'] } },
]

describe('Zuordnung der Auswahlwerte', () => {
  it('ordnet alte Texte über eigenschaften.vorlage zu', () => {
    const z = new Zuordner(werte)
    expect(z.streng('verkaufsstufe', 'Kunde kein Interesse', 'leads/L1')).toBe('kein_interesse')
    expect(z.streng('verkaufsstufe', 'neu', 'leads/L2')).toBe('neu')
    expect(z.unbekannt).toEqual([])
  })

  it('meldet unbekannte Werte statt sie still zu verlieren', () => {
    const z = new Zuordner(werte)
    expect(z.streng('verkaufsstufe', 'Gibt es nicht', 'leads/L3', 'neu')).toBe('neu')
    expect(z.unbekannt).toEqual([{ liste: 'verkaufsstufe', wert: 'Gibt es nicht', wo: 'leads/L3' }])
  })

  it('behält unbekannte Werte in lockeren Listen als Text', () => {
    expect(new Zuordner(werte).locker('quelle', 'Messe')).toBe('Messe')
  })
})

describe('Kontakt aus mehreren Quellen', () => {
  it('nimmt Namen aus der Offerte und Mail aus dem neuesten Lead', () => {
    const k = baueKontakt(7, [
      {
        art: 'projekt',
        zeit: '2026-01-01',
        datensatz: { vornameMO: 'Anna', nameMO: 'Muster', email: 'alt@beispiel.ch', lang: 'fr' },
      },
      {
        art: 'lead',
        zeit: '2026-09-01',
        datensatz: { name: 'Anna Muster', mail: 'NEU@beispiel.ch', sprache: 'Französisch' },
      },
    ])
    expect(k).toMatchObject({
      kundennummer: 7,
      vorname: 'Anna',
      nachname: 'Muster',
      email: 'neu@beispiel.ch',
      sprache: 'fr',
    })
  })
})

describe('Zählbericht', () => {
  const daten = /** @type {any} */ ({
    v: 1,
    at: '',
    by: '',
    counts: { leads: 2, tasks: 0 },
    cols: { leads: { L1: {}, L2: {} }, tasks: {} },
    blobs: [{ id: 'b1' }],
  })

  it('stimmt, wenn jede Zeile und jede Datei zugeordnet ist', () => {
    const abgleich = [
      { sammlung: 'leads', alt_schluessel: 'L1', ziel_tabelle: 'verkaufschancen' },
      { sammlung: 'leads', alt_schluessel: 'L2', ziel_tabelle: 'verkaufschancen' },
      { sammlung: 'blobs', alt_schluessel: 'b1', ziel_tabelle: 'dokumente' },
    ]
    expect(erstelleBericht(daten, abgleich, [], [], 1).ok).toBe(true)
  })

  it('schlägt Alarm, wenn eine Zeile fehlt oder eine Datei nicht hochgeladen wurde', () => {
    const abgleich = [{ sammlung: 'leads', alt_schluessel: 'L1', ziel_tabelle: 'verkaufschancen' }]
    const b = erstelleBericht(daten, abgleich, [], [], 0)
    expect(b.ok).toBe(false)
    expect(b.zeilen.find((z) => z.sammlung === 'leads')?.ok).toBe(false)
  })
})
