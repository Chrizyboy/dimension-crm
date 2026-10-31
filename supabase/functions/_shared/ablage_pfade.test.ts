// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  elternPfad,
  ersetze,
  ordnerName,
  unterordnerFuer,
  type AblageEinstellung,
  type OffenerOrdner,
} from './ablage_pfade.ts'

const e: AblageEinstellung = {
  aktiv: true,
  aktiv_seit: '2026-11-02T00:00:00Z',
  name: '{nummer} - {kunde} - {ort}',
  standorte: {
    bulle: {
      offerten: 'BULLE/Devis - offre - Calculation/D {jahr}',
      auftraege: 'BULLE/Adjudications/A {jahr}',
      verloren: 'BULLE/Archives -Perdus',
    },
    muri: {
      offerten: 'MURI/2. DEVIS - OFFERTE/{jahr}',
      auftraege: 'MURI/1. ADJUDICATION - AUFTRÄGE/{jahr}',
      verloren: 'MURI/Archiv',
    },
  },
  unterordner: { devis: 'Devis - Soumission pour client - Offerte', photo: 'Photo - Fotos' },
  zuordnung: { offerte: 'devis', fotos: 'photo' },
}

// Erfundene Offerte.
const o: OffenerOrdner = {
  id: 'x',
  soll: 'offerte',
  stand: null,
  item_id: null,
  pfad: null,
  url: null,
  nummer: '101999',
  kunde: 'Lea Beispiel',
  ort: 'Riaz',
  titel: 'PV 12 kWp',
  standort: 'bulle',
  jahr_offerte: 2026,
  jahr_auftrag: 2027,
}

describe('Dateiablage: Namen und Pfade', () => {
  it('Ordnername wie bisher in Bulle', () => {
    expect(ordnerName(e, o)).toBe('101999 - Lea Beispiel - Riaz')
  })
  it('fehlender Ort lässt keinen Trenner stehen', () => {
    expect(ordnerName(e, { ...o, ort: null })).toBe('101999 - Lea Beispiel')
    expect(ersetze('{nummer} - {kunde} - {ort}', { nummer: '1', kunde: '', ort: 'Muri' })).toBe('1 - Muri')
  })
  it('verbotene Zeichen werden ersetzt', () => {
    expect(ordnerName(e, { ...o, kunde: 'Müller / Söhne AG' })).toBe('101999 - Müller - Söhne AG - Riaz')
  })
  it('Offerte, Auftrag und Verloren je Standort', () => {
    expect(elternPfad(e, o)).toBe('BULLE/Devis - offre - Calculation/D 2026')
    expect(elternPfad(e, { ...o, soll: 'auftrag' })).toBe('BULLE/Adjudications/A 2027')
    expect(elternPfad(e, { ...o, soll: 'verloren' })).toBe('BULLE/Archives -Perdus')
    expect(elternPfad(e, { ...o, standort: 'muri', soll: 'auftrag' })).toBe('MURI/1. ADJUDICATION - AUFTRÄGE/2027')
  })
  it('unbekannter Standort nimmt den ersten', () => {
    expect(elternPfad(e, { ...o, standort: 'zug' })).toBe('BULLE/Devis - offre - Calculation/D 2026')
  })
  it('Dokument-Ordner zum Unterordner', () => {
    expect(unterordnerFuer(e, 'offerte')).toBe('Devis - Soumission pour client - Offerte')
    expect(unterordnerFuer(e, 'fotos')).toBe('Photo - Fotos')
    expect(unterordnerFuer(e, 'dossier')).toBeNull()
    expect(unterordnerFuer(e, null)).toBeNull()
  })
})
