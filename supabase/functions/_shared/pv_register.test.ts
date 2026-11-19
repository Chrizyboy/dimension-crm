import { describe, expect, it } from 'vitest'
import { leistungKw, pvAmGebaeude, pvAusTreffern } from './pv_register.ts'

// Antworten im Aufbau von api3.geo.admin.ch (Layer ch.bfe.elektrizitaetsproduktionsanlagen), mit erfundenen Werten.

describe('PV-Register des Bundes', () => {
  it('liest die Leistung aus Text oder Zahl', () => {
    expect(leistungKw('123.4 kW')).toBe(123.4)
    expect(leistungKw(80)).toBe(80)
    expect(leistungKw("1'200 kW")).toBe(1200)
    expect(leistungKw('kaputt')).toBe(0)
    expect(leistungKw(null)).toBe(0)
  })

  it('behält nur Photovoltaik, mit Lage aus GeoJSON oder Esri', () => {
    const a = pvAusTreffern([
      {
        properties: { sub_category_de: 'Photovoltaik', egid: 190100, total_power: '250 kW' },
        geometry: { coordinates: [2668000, 1236000] },
      },
      { attributes: { sub_category_en: 'Photovoltaic', egid: null, total_power: '30 kW' }, geometry: { x: 1, y: 2 } },
      { properties: { sub_category_de: 'Wasserkraft', egid: 5, total_power: '19000 kW' } },
    ])
    expect(a).toEqual([
      { egid: '190100', kw: 250, e: 2668000, n: 1236000 },
      { egid: null, kw: 30, e: 1, n: 2 },
    ])
  })

  it('zählt Anlagen mit gleicher EGID oder nahe am Gebäude, grosse Hallen mit grösserem Radius', () => {
    const anlagen = [
      { egid: '7', kw: 100, e: 0, n: 0 },
      { egid: null, kw: 20, e: 2668030, n: 1236000 },
      { egid: null, kw: 50, e: 2668090, n: 1236000 },
    ]
    expect(pvAmGebaeude(anlagen, { egid: '7', e: 2668000, n: 1236000 })).toBe(120)
    expect(pvAmGebaeude(anlagen, { egid: null, e: 2668000, n: 1236000, grundflaeche_m2: 10_000 })).toBe(70)
    expect(pvAmGebaeude([], { egid: '1', e: 0, n: 0 })).toBe(0)
  })
})
