import { describe, expect, it } from 'vitest'
import type { Finanzdaten, Zahlung } from '../types'
import { fixTermine, kalenderwoche, montag } from './datum'
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
          { id: 'r', nummer: 'R1', kunde: 'K', projekt_nummer: null, titel: '', offen_rappen: 1000, faellig_am: HEUTE },
        ],
        tranchen: [
          { id: 't', kunde: 'K', projekt_nummer: null, bezeichnung: 'Schluss', betrag_rappen: 2000, faellig_am: null },
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
