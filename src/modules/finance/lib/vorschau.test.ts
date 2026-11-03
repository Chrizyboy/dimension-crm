import { describe, expect, it } from 'vitest'
import type { Finanzdaten, Zahlung } from '../types'
import { fixTermine, kalenderwoche, montag } from './datum'
import { fuerFirma, reserveFuer } from './firma'
import { bewegungen, materialRappen, rappen, saldo, vorschau, zahllaufVorschlag, zaehlt } from './vorschau'

const HEUTE = '2026-10-22' // Donnerstag, KW 43

const zahlung = (z: Partial<Zahlung>): Zahlung => ({
  id: crypto.randomUUID(),
  firma: 'Muster AG',
  text: null,
  kategorie: 'Lieferant',
  rechnung_nr: null,
  rechnung_am: null,
  betrag_rappen: 100_000,
  faellig_am: '2026-10-30',
  geplant_am: null,
  prioritaet: 'normal',
  status: 'offen',
  geprueft: true,
  fixkosten_id: null,
  monat: null,
  notiz: null,
  quelle: null,
  abaninja_uuid: null,
  projekt_id: null,
  lieferant_id: null,
  offen_rappen: null,
  bezahlt_am: null,
  firma_id: null,
  pruefung: 'bereit',
  freigabe_von: null,
  freigabe_am: null,
  skonto_prozent: null,
  skonto_bis: null,
  skonto_rappen: null,
  iban: null,
  referenz: null,
  bestellung_id: null,
  zahllauf_id: null,
  ...z,
})

const leer = (x: Partial<Finanzdaten> = {}): Finanzdaten => ({
  zahlungen: [],
  material: [],
  fixkosten: [],
  eingaenge: [],
  rechnungen: [],
  tranchen: [],
  kundenzahlungen: [],
  konten: [],
  firmen: [],
  projektFirma: {},
  mwst: [],
  zahllaeufe: [],
  bestellungen: {},
  personen: {},
  einstellungen: { saldo: { betrag_rappen: 5_000_000, datum: '2026-10-20' }, wochen: 6, vorlauf: 5 },
  ...x,
})

describe('Kalender', () => {
  it('Montag und Kalenderwoche', () => {
    expect(montag(HEUTE)).toBe('2026-10-19')
    expect(kalenderwoche(HEUTE)).toBe(43)
    expect(kalenderwoche('2027-01-01')).toBe(53)
  })

  it('Fixkosten-Termine monatlich, je Quartal ab Startmonat, nur ab «ab»', () => {
    const f = { rhythmus: 'monat', tag: 27, start_monat: null, ab: '2026-11-01', bis: null }
    expect(fixTermine(f, '2026-10-01', '2027-01-31')).toEqual(['2026-11-27', '2026-12-27', '2027-01-27'])
    const q = { rhythmus: 'quartal', tag: 31, start_monat: '1', ab: null, bis: null }
    expect(fixTermine(q, '2026-10-01', '2027-04-30')).toEqual(['2026-10-28', '2027-01-28', '2027-04-28'])
  })
})

describe('Bewegungen', () => {
  it('Franken-Texte und Material mit MWST bei «exkl.»', () => {
    expect(rappen("1'234.50")).toBe(123_450)
    expect(rappen('')).toBe(0)
    expect(materialRappen({ position: 'Module', ek: 1000, transport: '100', exkl: true, status: 'offen' })).toBe(
      118_910,
    )
    expect(materialRappen({ position: 'Module', ek: 1000, exkl: false, status: 'offen' })).toBe(100_000)
  })

  it('Material ohne Datum: Bautermin minus Vorlauf; bezahlte Positionen fallen weg', () => {
    const d = leer({
      material: [
        {
          id: 'm1',
          firma_id: null,
          baustelle: 'Muster',
          projekt_id: null,
          bautermin: '2026-11-10',
          geplant_am: null,
          zahlbar_bis: null,
          archiviert: false,
          notiz: null,
          positionen: [
            { position: 'Module', ek: 500, status: 'offen' },
            { position: 'WR + Z', ek: 300, status: 'bezahlt' },
          ],
        },
      ],
    })
    const b = bewegungen(d, HEUTE)
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ datum: '2026-11-05', rappen: 50_000, idx: 0 })
  })

  it('Fixkosten fallen weg, wenn der Monat schon als Zahlung erfasst ist', () => {
    const fix = {
      id: 'f1',
      firma_id: null,
      bezeichnung: 'Miete',
      gruppe: 'Miete',
      detail: null,
      betrag_rappen: 300_000,
      rhythmus: 'monat',
      tag: 1,
      start_monat: null,
      ab: null,
      bis: null,
      standort: null,
      aktiv: true,
      notiz: null,
    }
    const ohne = bewegungen(leer({ fixkosten: [fix] }), HEUTE).map((b) => b.monat)
    expect(ohne).toContain('2026-11')
    const mit = bewegungen(
      leer({ fixkosten: [fix], zahlungen: [zahlung({ fixkosten_id: 'f1', monat: '2026-11', status: 'bezahlt' })] }),
      HEUTE,
    ).map((b) => b.monat)
    expect(mit).not.toContain('2026-11')
  })

  it('Szenarien: pessimistisch nur sichere Eingänge, realistisch ohne unsichere', () => {
    const b = bewegungen(
      leer({
        rechnungen: [
          {
            id: 'r',
            nummer: 'R1',
            kunde: 'K',
            projekt_nummer: null,
            titel: '',
            offen_rappen: 1000,
            faellig_am: HEUTE,
            firma_id: null,
            projekt_id: null,
          },
        ],
        tranchen: [
          {
            id: 't',
            kunde: 'K',
            projekt_nummer: null,
            bezeichnung: 'Schluss',
            betrag_rappen: 2000,
            faellig_am: null,
            projekt_id: null,
          },
        ],
      }),
      HEUTE,
    )
    const rechnung = b.find((x) => x.quelle === 'rechnung')
    const tranche = b.find((x) => x.quelle === 'tranche')
    if (!rechnung || !tranche) throw new Error('fehlt')
    expect([zaehlt(rechnung, 'pess'), zaehlt(rechnung, 'real'), zaehlt(rechnung, 'opt')]).toEqual([false, true, true])
    expect([zaehlt(tranche, 'pess'), zaehlt(tranche, 'real'), zaehlt(tranche, 'opt')]).toEqual([false, false, true])
  })
})

describe('Vorschau', () => {
  it('Saldo rechnerisch: minus seither bezahlte Zahlungen, plus Kundenzahlungen', () => {
    const d = leer({
      zahlungen: [zahlung({ status: 'bezahlt', bezahlt_am: '2026-10-21', betrag_rappen: 200_000 })],
      kundenzahlungen: [
        { datum: '2026-10-21', betrag_rappen: 50_000 },
        { datum: '2026-10-19', betrag_rappen: 999 },
      ],
    })
    expect(saldo(d)).toMatchObject({ bekannt: true, rappen: 4_850_000, buchungen: 2 })
    expect(saldo(leer({ einstellungen: {} })).bekannt).toBe(false)
  })

  it('Woche 0 enthält Überfälliges und Ungeplantes; tiefster Stand', () => {
    const d = leer({
      zahlungen: [
        zahlung({ faellig_am: '2026-10-01', betrag_rappen: 1_000_000 }),
        zahlung({ faellig_am: null, betrag_rappen: 500_000 }),
        zahlung({ faellig_am: '2026-11-03', betrag_rappen: 6_000_000 }),
      ],
      eingaenge: [
        {
          id: 'e',
          firma_id: null,
          kunde: 'K',
          projekt_id: null,
          text: null,
          betrag_rappen: 3_000_000,
          erwartet_am: '2026-11-12',
          eingang_am: null,
          wahrscheinlichkeit: 'sicher',
          status: 'offen',
          geprueft: true,
          quelle: null,
        },
      ],
    })
    const v = vorschau(d, HEUTE, 'real')
    expect(v.wochen).toHaveLength(6)
    expect(v.wochen[0]).toMatchObject({ kw: 43, aus: 1_500_000, ende: 3_500_000 })
    expect(v.wochen[3]).toMatchObject({ kw: 46, ein: 3_000_000 })
    expect(v.tiefste?.kw).toBe(45)
    expect(v.tiefste?.ende).toBe(-2_500_000)
    expect(v.ohneDatum).toBe(1)
  })

  it('Zahllauf: Betreibung und Mahnung zuerst, dann nach Fälligkeit, solange das Geld reicht', () => {
    const ids = zahllaufVorschlag(
      [
        { id: 'a', rappen: 500, prioritaet: 'normal', faellig_am: '2026-10-01' },
        { id: 'b', rappen: 700, prioritaet: 'betreibung', faellig_am: '2026-11-01' },
        { id: 'c', rappen: 400, prioritaet: 'mahnung', faellig_am: null },
        { id: 'd', rappen: 100, prioritaet: 'normal', faellig_am: '2026-12-01' },
      ],
      1300,
    )
    expect(ids).toEqual(['b', 'c', 'd'])
  })
})

describe('Gesellschaften, Konten und MWST', () => {
  const muri = 'f-muri'
  const bulle = 'f-bulle'
  const d = leer({
    firmen: [
      { id: muri, kuerzel: 'gmbh', name: 'Muri GmbH' },
      { id: bulle, kuerzel: 'sarl', name: 'Bulle Sàrl' },
    ],
    konten: [
      {
        id: 'k1',
        firma_id: muri,
        name: 'UBS',
        iban: null,
        stand_rappen: 10_000_000,
        stand_am: '2026-10-20',
        reihenfolge: 0,
        aktiv: true,
        notiz: null,
      },
      {
        id: 'k2',
        firma_id: bulle,
        name: 'BCF',
        iban: null,
        stand_rappen: 4_000_000,
        stand_am: '2026-10-15',
        reihenfolge: 0,
        aktiv: true,
        notiz: null,
      },
    ],
    zahlungen: [
      zahlung({ id: 'a', firma_id: muri, betrag_rappen: 100_000, faellig_am: '2026-10-23' }),
      zahlung({ id: 'b', firma_id: bulle, betrag_rappen: 50_000, faellig_am: '2026-10-23' }),
    ],
    tranchen: [
      {
        id: 't',
        kunde: 'K',
        projekt_nummer: '101',
        bezeichnung: 'Anzahlung',
        betrag_rappen: 7000,
        faellig_am: '2026-10-23',
        projekt_id: 'p1',
      },
    ],
    projektFirma: { p1: bulle },
    mwst: [
      {
        firma_id: muri,
        periode: '2026-Q3',
        von: '2026-07-01',
        bis: '2026-09-30',
        faellig_am: '2026-11-29',
        umsatz_rappen: 0,
        umsatzsteuer_rappen: 0,
        vorsteuer_rappen: 0,
        zahllast_rappen: 300_000,
        verbindlich: false,
        bezahlt_am: null,
      },
      {
        firma_id: bulle,
        periode: '2026-Q2',
        von: '2026-04-01',
        bis: '2026-06-30',
        faellig_am: '2026-08-29',
        umsatz_rappen: 0,
        umsatzsteuer_rappen: 0,
        vorsteuer_rappen: 0,
        zahllast_rappen: 99,
        verbindlich: true,
        bezahlt_am: '2026-08-20',
      },
    ],
  })

  it('Kontostand aus den Konten, je Gesellschaft getrennt', () => {
    expect(saldo(d)).toMatchObject({ bekannt: true, rappen: 14_000_000, seit: '2026-10-15' })
    expect(saldo(fuerFirma(d, muri)).rappen).toBe(10_000_000)
    expect(saldo(fuerFirma(d, bulle)).rappen).toBe(4_000_000)
  })

  it('Posten nur bei ihrer Gesellschaft, Tranchen über das Projekt', () => {
    const b = fuerFirma(d, bulle)
    expect(b.zahlungen.map((z) => z.id)).toEqual(['b'])
    expect(b.tranchen.map((t) => t.id)).toEqual(['t'])
    expect(fuerFirma(d, muri).tranchen).toEqual([])
  })

  it('MWST erscheint als Ausgang am Fälligkeitstag, bezahlte nicht', () => {
    const m = bewegungen(d, HEUTE).filter((x) => x.quelle === 'mwst')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ richtung: -1, rappen: 300_000, datum: '2026-11-29', titel: 'MWST 2026-Q3' })
  })

  it('Reserve je Gesellschaft oder zusammen', () => {
    const e = { ...d, einstellungen: { reserve_je_firma: { [muri]: 5000, [bulle]: 3000 } } }
    expect(reserveFuer(e, muri)).toBe(5000)
    expect(reserveFuer(e, null)).toBe(8000)
    expect(reserveFuer(leer({ einstellungen: { reserve_rappen: 70 } }), null)).toBe(70)
  })
})
