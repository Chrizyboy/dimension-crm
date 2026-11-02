import { describe, expect, it } from 'vitest'
import type { Spese } from '../types'
import {
  aenderbar,
  filtern,
  gruppieren,
  jePerson,
  kmBetrag,
  mailZeilen,
  meineZahlen,
  mwstAusBetrag,
  spesenCsv,
  summe,
} from './spesen'

/** Testspese mit vernünftigen Vorgaben. */
const testSpese = (x: Partial<Spese>): Spese => ({
  id: crypto.randomUUID(),
  person_id: 'p1',
  person: 'Lea Exemple',
  kuerzel: 'LE',
  datum: '2026-10-20',
  betrag_rappen: 1250,
  kategorie: 'Parkieren',
  zweck: 'Kundentermin',
  notiz: null,
  beleg_id: null,
  beleg_name: null,
  beleg_typ: null,
  status: 'eingereicht',
  art: 'beleg',
  bezahlt_mit: 'eigen',
  projekt_id: null,
  projekt_nummer: null,
  projekt_titel: null,
  mwst_satz: null,
  mwst_rappen: null,
  km: null,
  km_satz_rappen: null,
  strecke: null,
  personen: null,
  waehrung: 'CHF',
  konto: '6200',
  hinweise: [],
  geprueft_am: null,
  geprueft_von: null,
  rueckfrage: null,
  rueckfrage_am: null,
  abgelehnt_grund: null,
  ausbezahlt_am: null,
  ausbezahlt_von: null,
  ausbezahlt_mit: null,
  auszahlung_id: null,
  storniert_am: null,
  storniert_von: null,
  storniert_grund: null,
  verlauf: [],
  erstellt_am: '2026-10-20T10:00:00Z',
  ...x,
})

describe('Spesen', () => {
  const liste = [
    testSpese({ betrag_rappen: 1000 }),
    testSpese({ betrag_rappen: 2000, person_id: 'p2', person: 'Marco Muster', status: 'geprueft' }),
    testSpese({ betrag_rappen: 500, status: 'ausbezahlt', ausbezahlt_am: '2026-10-21', ausbezahlt_mit: 'lohn' }),
    testSpese({ betrag_rappen: 700, status: 'storniert' }),
    testSpese({ betrag_rappen: 300, status: 'rueckfrage', rueckfrage: 'Beleg unleserlich' }),
    testSpese({ betrag_rappen: 9640, bezahlt_mit: 'firmenkarte', status: 'geprueft' }),
  ]

  it('filtert offen, ausbezahlt, Firmenkarte, abgelehnt', () => {
    expect(filtern(liste, 'offen')).toHaveLength(3)
    expect(filtern(liste, 'ausbezahlt')).toHaveLength(1)
    expect(filtern(liste, 'firmenkarte')).toHaveLength(1)
    expect(filtern(liste, 'abgelehnt')).toHaveLength(1)
    expect(filtern(liste, 'alle')).toHaveLength(6)
  })

  it('ändern nur vor der Prüfung oder bei Rückfrage', () => {
    expect(liste.map(aenderbar)).toEqual([true, false, false, false, true, false])
  })

  it('Kopfzahlen der eigenen Spesen', () => {
    const z = meineZahlen(liste, '2026')
    expect(z.geprueft).toEqual({ rappen: 2000, anzahl: 1 })
    expect(z.eingereicht).toEqual({ rappen: 1000, anzahl: 1 })
    expect(z.rueckfragen).toHaveLength(1)
    expect(z.jahr.rappen).toBe(500)
    expect(z.letzte).toEqual({ am: '2026-10-21', mit: 'lohn' })
  })

  it('summiert je Person, grösste zuerst, mit Kilometern', () => {
    const je = jePerson([
      testSpese({ betrag_rappen: 1000 }),
      testSpese({ betrag_rappen: 2940, person_id: 'p2', person: 'Marco', km: 42 }),
      testSpese({ betrag_rappen: 500 }),
    ])
    expect(je.map((p) => [p.person, p.rappen, p.anzahl, p.km])).toEqual([
      ['Marco', 2940, 1, 42],
      ['Lea Exemple', 1500, 2, 0],
    ])
  })

  it('gruppiert nach Schlüssel und lässt null weg', () => {
    const g = gruppieren(liste, (s) => (s.status === 'storniert' ? null : s.kategorie))
    expect(g).toEqual([{ schluessel: 'Parkieren', rappen: 13440, anzahl: 5 }])
  })

  it('rechnet Kilometer und MWST wie die Datenbank', () => {
    expect(kmBetrag(42, 70)).toBe(2940)
    expect(kmBetrag(12.5, 70)).toBe(875)
    expect(mwstAusBetrag(3240, 8.1)).toBe(243)
    expect(mwstAusBetrag(18600, 8.1)).toBe(1394)
  })

  it('summiert', () => {
    expect(summe(liste)).toBe(14140)
  })

  it('CSV mit Konto, MWST und BOM', () => {
    const csv = spesenCsv(
      [testSpese({ zweck: 'Parkhaus; Bern', mwst_satz: 8.1, mwst_rappen: 94, projekt_nummer: 'P-118' })],
      'de',
      { kategorie: (k) => k, status: (x) => x, bezahlt: (b) => b },
    )
    expect(csv.startsWith('﻿Datum;Person;Kategorie;Konto')).toBe(true)
    expect(csv).toContain(
      '20.10.2026;Lea Exemple;Parkieren;6200;"Parkhaus; Bern";P-118;12.50;8.1;0.94;eigen;eingereicht',
    )
  })

  it('Mail-Text mit Total', () => {
    const text = mailZeilen([testSpese({ betrag_rappen: 1250 }), testSpese({ betrag_rappen: 750 })], (k) => k)
    expect(text).toContain('- 20.10.2026 · Parkieren · Kundentermin · CHF 12.50')
    expect(text).toContain('Total CHF 20.00')
  })
})
