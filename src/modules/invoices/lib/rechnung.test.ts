import { describe, expect, it } from 'vitest'
import type { Rechnung } from '../types'
import { ibanAnzeige, ibanPruefen, qrInhalt, strasseTeilen } from './qr'
import { mahnbar, plusTage, rechnungenCsv, summen } from './rechnung'

describe('Summen wie in der Datenbank', () => {
  it('inkl. MWST: MWST herausgerechnet', () => {
    expect(summen([{ menge: 1, preis_rappen: 900000 }], true, 8.1)).toEqual({
      netto: 832562,
      mwst: 67438,
      total: 900000,
    })
  })
  it('exkl. MWST: MWST draufgeschlagen, Zeilen auf Rappen gerundet', () => {
    expect(
      summen(
        [
          { menge: 1.5, preis_rappen: 12000 },
          { menge: 2, preis_rappen: 1999 },
        ],
        false,
        8.1,
      ),
    ).toEqual({
      netto: 21998,
      mwst: 1782,
      total: 23780,
    })
  })
  it('Abzüge (negative Zeilen) zählen mit', () => {
    expect(
      summen(
        [
          { menge: 1, preis_rappen: 3000000 },
          { menge: 1, preis_rappen: -900000 },
        ],
        true,
        8.1,
      ).total,
    ).toBe(2100000)
  })
})

describe('Mahnen', () => {
  const r = { status: 'gestellt' as const, faellig_am: '2026-10-01', mahnstufe: 0 }
  it('nur fällige, gestellte Rechnungen bis Stufe 3', () => {
    expect(mahnbar(r, '2026-10-22')).toBe(true)
    expect(mahnbar({ ...r, faellig_am: '2026-10-22' }, '2026-10-22')).toBe(false)
    expect(mahnbar({ ...r, mahnstufe: 3 }, '2026-10-22')).toBe(false)
    expect(mahnbar({ ...r, status: 'bezahlt' }, '2026-10-22')).toBe(false)
  })
  it('Tage zählen über das Monatsende', () => {
    expect(plusTage('2026-10-25', 10)).toBe('2026-11-04')
  })
})

describe('CSV «Liste exportieren»', () => {
  it('Strichpunkt, Beträge in Franken, Datum TT.MM.JJJJ, BOM', () => {
    const r = {
      nummer: 'R2026-17',
      datum: '2026-10-01',
      faellig_am: '2026-10-31',
      kunde: 'Muster; Anna',
      kundennummer: 1015,
      projekt_nummer: '200005',
      art: 'anzahlung',
      status: 'gestellt',
      total_rappen: 900000,
      bezahlt_rappen: 0,
      offen_rappen: 900000,
      mahnstufe: 1,
      firma: 'gmbh',
      abaninja_status: null,
    } as unknown as Rechnung
    const csv = rechnungenCsv([r], 'de', { art: (a) => a, status: (s) => s })
    expect(csv.startsWith('\ufeffNummer;Datum')).toBe(true)
    expect(csv).toContain(
      'R2026-17;01.10.2026;31.10.2026;"Muster; Anna";1015;200005;anzahlung;gestellt;9000.00;0.00;9000.00;1;gmbh;',
    )
  })
})

describe('Swiss QR-Code', () => {
  it('prüft IBAN: Format, Prüfziffer, keine QR-IBAN', () => {
    expect(ibanPruefen('CH93 0076 2011 6238 5295 7')).toBe('ok')
    expect(ibanPruefen('CH94 0076 2011 6238 5295 7')).toBe('pruefziffer')
    expect(ibanPruefen('DE89 3704 0044 0532 0130 00')).toBe('format')
    expect(ibanPruefen('CH44 3199 9123 0008 8901 2')).toBe('qr_iban')
    expect(ibanAnzeige('ch9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7')
  })
  it('teilt Strasse und Hausnummer', () => {
    expect(strasseTeilen('Luzernerstrasse 35')).toEqual({ strasse: 'Luzernerstrasse', hausnummer: '35' })
    expect(strasseTeilen('Chemin des Crêts')).toEqual({ strasse: 'Chemin des Crêts', hausnummer: '' })
  })
  it('baut den Inhalt nach SPC 0200 (31 Zeilen, ohne Referenz, Nummer als Mitteilung)', () => {
    const inhalt = qrInhalt({
      iban: 'CH93 0076 2011 6238 5295 7',
      glaeubiger: { name: 'Dimension Solaire GmbH', strasse: 'Luzernerstrasse 35', plz: '5630', ort: 'Muri AG' },
      betragRappen: 123450,
      schuldner: { name: 'Anna Muster', strasse: 'Musterweg 1', plz: '1630', ort: 'Bulle' },
      mitteilung: 'Rechnung R2026-17',
    })
    const z = inhalt.split('\n')
    expect(z).toHaveLength(31)
    expect(z.slice(0, 11)).toEqual([
      'SPC',
      '0200',
      '1',
      'CH9300762011623852957',
      'S',
      'Dimension Solaire GmbH',
      'Luzernerstrasse',
      '35',
      '5630',
      'Muri AG',
      'CH',
    ])
    expect(z.slice(18, 20)).toEqual(['1234.50', 'CHF'])
    expect(z.slice(27)).toEqual(['NON', '', 'Rechnung R2026-17', 'EPD'])
  })
})
