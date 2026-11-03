import { describe, expect, it } from 'vitest'
import type { Bedarf, Bestellung } from '../types'
import { bedarfJeLieferant, nachSchritt } from './leitstand'

const bedarf = (b: Partial<Bedarf>): Bedarf => ({
  quelle: 'projekt',
  projekt_id: null,
  material_id: null,
  artikel_id: null,
  bezeichnung: 'x',
  einheit: 'Stk',
  fehlt: 1,
  aus_lager: 0,
  lagerort_id: null,
  projekt_nummer: null,
  kunde: null,
  baubeginn: null,
  artikelnummer: null,
  lieferant_id: null,
  lieferant: null,
  ek_rappen: null,
  verpackungseinheit: null,
  lieferzeit_tage: null,
  bestellen_bis: null,
  ...b,
})

describe('bedarfJeLieferant', () => {
  it('bündelt je Lieferant, zieht Lager ab und sortiert nach Bestellen-bis', () => {
    const r = bedarfJeLieferant([
      bedarf({
        lieferant_id: 'k',
        lieferant: 'Krannich',
        fehlt: 10,
        ek_rappen: 100,
        projekt_nummer: 'P1',
        bestellen_bis: '2026-11-09',
      }),
      bedarf({
        lieferant_id: 'k',
        lieferant: 'Krannich',
        fehlt: 5,
        aus_lager: 2,
        ek_rappen: 100,
        projekt_nummer: 'P2',
        bestellen_bis: '2026-11-04',
      }),
      bedarf({ lieferant_id: 't', lieferant: 'Tritec', fehlt: 3, aus_lager: 3 }),
      bedarf({ lieferant_id: 's', lieferant: 'Solarmarkt', fehlt: 1, ek_rappen: 50, bestellen_bis: '2026-11-20' }),
    ])
    expect(r.map((g) => g.lieferant)).toEqual(['Krannich', 'Solarmarkt'])
    expect(r[0]).toMatchObject({ zeilen: 2, total_rappen: 1300, projekte: ['P1', 'P2'], bestellen_bis: '2026-11-04' })
    expect(r[1]?.projekte).toEqual(['Lager'])
  })
})

describe('nachSchritt', () => {
  it('ordnet nach Schritt, Gefährdete zuerst', () => {
    const b = (id: string, schritt: Bestellung['schritt'], gefaehrdet = false) =>
      ({ id, schritt, gefaehrdet, erwartet_am: null }) as unknown as Bestellung
    const r = nachSchritt([b('1', 'unterwegs'), b('2', 'unterwegs', true), b('3', 'fertig'), b('4', 'freigabe')])
    expect(r.unterwegs.map((x) => x.id)).toEqual(['2', '1'])
    expect(r.freigabe).toHaveLength(1)
  })
})
