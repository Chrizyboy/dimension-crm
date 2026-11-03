import { describe, expect, it } from 'vitest'
import type { AusweisArt, Kurs, Mitglied, Qualifikation } from '../types'
import {
  ausweisKurz,
  geplanteKurse,
  kursKosten,
  kursTage,
  kursVorschlaege,
  offeneRueckzahlung,
  zellenStandMitKurs,
} from './kurse'
import { neueste } from './matrix'

const kurs = (k: Partial<Kurs>): Kurs => ({
  id: 'k',
  titel: 'Kurs',
  art: 'erste_hilfe',
  anbieter: null,
  ort: null,
  von: null,
  bis: null,
  personen: [],
  besucht_von: [],
  stand: 'bewilligt',
  beantragt_von: null,
  beantragt_name: null,
  bewilligt_name: null,
  bewilligt_am: null,
  absage_grund: null,
  notiz: null,
  darf_planen: false,
  darf_bewilligen: false,
  ...k,
})
const person = (id: string, rolle = 'montage'): Mitglied => ({
  id,
  name: id,
  rolle,
  rolle_de: rolle,
  rolle_fr: rolle,
  standort_id: null,
})
const quali = (person_id: string, art: string, gueltig_bis: string | null): Qualifikation => ({
  id: `${person_id}${art}`,
  person_id,
  art,
  bezeichnung: null,
  erworben_am: null,
  gueltig_bis,
  aussteller: null,
  datei_pfad: null,
  notiz: null,
})
const arten: AusweisArt[] = [
  { schluessel: 'erste_hilfe', gueltig_monate: 24, pflicht_fuer: ['montage'] },
  { schluessel: 'stapler', gueltig_monate: null, pflicht_fuer: [] },
]

describe('Kurse', () => {
  it('nur bewilligte und angemeldete Kurse mit Art zählen als geplant, der früheste gewinnt', () => {
    const g = geplanteKurse([
      kurs({ id: 'a', personen: ['p1'], von: '2026-12-01' }),
      kurs({ id: 'b', personen: ['p1'], von: '2026-11-18', stand: 'angemeldet' }),
      kurs({ id: 'c', personen: ['p2'], stand: 'beantragt' }),
      kurs({ id: 'd', personen: ['p3'], art: null }),
    ])
    expect(g.get('p1:erste_hilfe')?.id).toBe('b')
    expect(g.has('p2:erste_hilfe')).toBe(false)
    expect(g.size).toBe(1)
  })

  it('ein gebuchter Kurs macht aus «fehlt» oder «abgelaufen» ein «geplant»', () => {
    const k = kurs({})
    expect(zellenStandMitKurs(undefined, true, '2026-11-02', k)).toBe('geplant')
    expect(zellenStandMitKurs(quali('p', 'x', '2026-10-01'), false, '2026-11-02', k)).toBe('geplant')
    expect(zellenStandMitKurs(quali('p', 'x', '2028-10-01'), false, '2026-11-02', k)).toBe('gueltig')
    expect(zellenStandMitKurs(undefined, false, '2026-11-02', k)).toBe('leer')
  })

  it('Vorschläge: fehlende Pflicht zuerst, ohne schon geplante Personen', () => {
    const personen = [person('p1'), person('p2'), person('p3'), person('p4', 'verkauf')]
    const gueltig = neueste([quali('p2', 'erste_hilfe', '2026-12-01'), quali('p3', 'erste_hilfe', '2028-01-01')])
    const geplant = geplanteKurse([kurs({ personen: ['p1'] })])
    const v = kursVorschlaege(personen, arten, gueltig, geplant, '2026-11-02')
    expect(v).toEqual([{ art: 'erste_hilfe', personen: ['p2'], fehlt: 0 }])
    const ohne = kursVorschlaege(personen, arten, gueltig, new Map(), '2026-11-02')
    expect(ohne[0]).toEqual({ art: 'erste_hilfe', personen: ['p1', 'p2'], fehlt: 1 })
  })

  it('Kosten ohne abgesagte, Kurstage je Person', () => {
    const kurse = [
      kurs({ kosten_rappen: 38000, stand: 'angemeldet', von: '2026-11-27', personen: ['a', 'b'] }),
      kurs({ kosten_rappen: 145000, stand: 'abgesagt' }),
      kurs({
        kosten_rappen: 52000,
        stand: 'besucht',
        von: '2026-09-11',
        bis: '2026-09-12',
        personen: ['a', 'b'],
        besucht_von: ['a'],
      }),
    ]
    expect(kursKosten(kurse)).toBe(90000)
    expect(kursTage(kurse)).toBe(4)
  })

  it('Rückzahlung nimmt bis «Bindung bis» linear ab', () => {
    const k = { von: '2026-01-16', bis: '2026-01-16', vereinbarung_rappen: 120000, vereinbarung_bis: '2028-01-16' }
    expect(offeneRueckzahlung(k, '2026-01-01')).toBe(120000)
    expect(offeneRueckzahlung(k, '2027-01-16')).toBe(60000)
    expect(offeneRueckzahlung(k, '2028-02-01')).toBe(0)
    expect(offeneRueckzahlung({ ...k, vereinbarung_rappen: null }, '2027-01-16')).toBe(0)
  })
})

describe('ausweisKurz', () => {
  it('zeigt das dringendste Thema und zählt alle', () => {
    const p = person('p1')
    const gueltig = neueste([quali('p1', 'erste_hilfe', '2026-12-01')])
    expect(ausweisKurz(p, arten, gueltig, new Map(), '2026-11-02')).toEqual({
      stand: 'bald',
      art: 'erste_hilfe',
      datum: '2026-12-01',
      anzahl: 1,
    })
    expect(
      ausweisKurz(p, arten, new Map(), geplanteKurse([kurs({ personen: ['p1'], von: '2026-11-18' })]), '2026-11-02'),
    ).toEqual({ stand: 'geplant', art: 'erste_hilfe', datum: '2026-11-18', anzahl: 1 })
    expect(ausweisKurz(person('p2', 'verkauf'), arten, new Map(), new Map(), '2026-11-02').stand).toBe('gueltig')
  })
})
