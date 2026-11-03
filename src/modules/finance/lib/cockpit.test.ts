import { describe, expect, it } from 'vitest'
import type { Finanzdaten, Zahlung } from '../types'
import { heuteZuTun, nachAlter, zahllaufKandidaten } from './cockpit'

const HEUTE = '2026-11-02'
const F = 'f-muri'

const z = (x: Partial<Zahlung>): Zahlung =>
  ({
    id: crypto.randomUUID(),
    firma: 'Krannich',
    status: 'offen',
    pruefung: 'bereit',
    firma_id: F,
    betrag_rappen: 100_000,
    offen_rappen: 100_000,
    faellig_am: '2026-11-05',
    skonto_bis: null,
    skonto_rappen: null,
    zahllauf_id: null,
    prioritaet: 'normal',
    kategorie: 'Lieferant',
    ...x,
  }) as Zahlung

const daten = (x: Partial<Finanzdaten>): Finanzdaten =>
  ({
    zahlungen: [],
    zahllaeufe: [],
    konten: [
      {
        id: 'k',
        firma_id: F,
        name: 'UBS',
        iban: null,
        stand_rappen: 1,
        stand_am: HEUTE,
        reihenfolge: 0,
        aktiv: true,
        notiz: null,
      },
    ],
    mwst: [],
    firmen: [{ id: F, kuerzel: 'gmbh', name: 'Muri GmbH' }],
    ...x,
  }) as Finanzdaten

describe('Heute zu tun', () => {
  it('Skonto, Freigabe und alter Kontostand erscheinen, das Dringendste zuerst', () => {
    const l = heuteZuTun(
      daten({
        zahlungen: [z({ skonto_bis: '2026-11-03', skonto_rappen: 2000 }), z({ pruefung: 'freigabe' })],
        konten: [
          {
            id: 'k',
            firma_id: F,
            name: 'BCF',
            iban: null,
            stand_rappen: 1,
            stand_am: '2026-10-20',
            reihenfolge: 0,
            aktiv: true,
            notiz: null,
          },
        ],
      }),
      HEUTE,
      null,
    )
    expect(l.map((x) => x.schluessel)).toEqual(['skonto', 'freigabe', 'kontoAlt'])
    expect(l[0]?.werte.betrag).toBe(2000)
  })

  it('Zahllauf: wer vorbereitet hat, wartet; die anderen geben frei', () => {
    const d = daten({
      zahllaeufe: [
        {
          id: 'zl',
          firma_id: F,
          konto_id: null,
          ausfuehren_am: '2026-11-06',
          status: 'zur_freigabe',
          vorbereitet_von: 'erich',
          freigegeben_von: null,
          freigegeben_am: null,
          erledigt_am: null,
          erstellt_am: HEUTE,
          notiz: null,
        },
      ],
      zahlungen: [z({ zahllauf_id: 'zl' })],
    })
    expect(heuteZuTun(d, HEUTE, 'erich')[0]?.schluessel).toBe('zahllaufWartet')
    expect(heuteZuTun(d, HEUTE, 'chris')[0]).toMatchObject({
      schluessel: 'zahllaufFreigeben',
      werte: { count: 1, betrag: 100_000 },
    })
  })
})

describe('Zahllauf-Vorschlag', () => {
  it('nur geprüfte der Gesellschaft, Skonto abgezogen und zuerst, ohne Löhne', () => {
    const l = zahllaufKandidaten(
      [
        z({ id: 'a', faellig_am: '2026-11-04' }),
        z({ id: 'b', faellig_am: '2026-11-30', skonto_bis: '2026-11-07', skonto_rappen: 2000 }),
        z({ id: 'c', pruefung: 'freigabe' }),
        z({ id: 'd', firma_id: 'f-bulle' }),
        z({ id: 'e', faellig_am: '2026-12-31' }),
        z({ id: 'f', kategorie: 'Lohn' }),
      ],
      F,
      '2026-11-06',
    )
    expect(l.map((x) => x.z.id)).toEqual(['b', 'a'])
    expect(l[0]?.rappen).toBe(98_000)
  })
})

describe('Kundenrechnungen nach Alter', () => {
  it('teilt nach Tagen über der Fälligkeit', () => {
    const r = (faellig_am: string | null, offen_rappen: number) =>
      ({ id: faellig_am ?? 'x', faellig_am, offen_rappen }) as Finanzdaten['rechnungen'][number]
    const s = nachAlter(
      [r(null, 1), r('2026-11-10', 2), r('2026-10-20', 4), r('2026-09-20', 8), r('2026-08-01', 16)],
      HEUTE,
    )
    expect(s.map((x) => x.rappen)).toEqual([3, 4, 8, 16])
  })
})
