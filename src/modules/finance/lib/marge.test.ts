import { describe, expect, it } from 'vitest'
import type { MargeZeile } from '../services/ablaeufe'
import { margeAuswerten } from './marge'

const zeile = (z: Partial<MargeZeile>): MargeZeile => ({
  projekt_id: 'p',
  nummer: 'P-1',
  titel: null,
  kunde: null,
  status: 'im_bau',
  firma_id: null,
  produkt: 'pv',
  unterzeichnet_am: null,
  umsatz_rappen: 0,
  verrechnet_rappen: 0,
  bezahlt_rappen: 0,
  kosten_rappen: 0,
  material_rappen: 0,
  arbeit_rappen: 0,
  soll_verkauf_rappen: null,
  soll_einkauf_rappen: null,
  schlussrechnung: false,
  ...z,
})

describe('margeAuswerten', () => {
  const liste = [
    zeile({
      projekt_id: 'a',
      status: 'abgeschlossen',
      umsatz_rappen: 100_000,
      kosten_rappen: 80_000,
      soll_verkauf_rappen: 100_000,
      soll_einkauf_rappen: 70_000,
    }),
    zeile({
      projekt_id: 'b',
      status: 'abgeschlossen',
      umsatz_rappen: 100_000,
      kosten_rappen: 72_000,
      soll_verkauf_rappen: 100_000,
      soll_einkauf_rappen: 70_000,
    }),
    zeile({
      projekt_id: 'c',
      status: 'im_bau',
      umsatz_rappen: 50_000,
      kosten_rappen: 30_000,
      verrechnet_rappen: 10_000,
    }),
    zeile({
      projekt_id: 'd',
      produkt: 'waermepumpe',
      schlussrechnung: true,
      umsatz_rappen: 40_000,
      kosten_rappen: 30_000,
    }),
  ]

  it('zählt Marge je Produkt nur aus fertigen Projekten', () => {
    const a = margeAuswerten(liste, 'alle')
    const pv = a.produkte.find((p) => p.produkt === 'pv')
    expect(pv?.anzahl).toBe(2)
    expect(pv?.prozent).toBeCloseTo(24)
    expect(a.produkte.find((p) => p.produkt === 'waermepumpe')?.prozent).toBeCloseTo(25)
  })

  it('erkennt «unter Soll» erst ab 5 Punkten', () => {
    const a = margeAuswerten(liste, 'unterSoll')
    expect(a.zeilen.map((z) => z.m.projekt_id)).toEqual(['a'])
  })

  it('rechnet angefangene Arbeiten aus Kosten minus verrechnet', () => {
    const a = margeAuswerten(liste, 'laufend')
    expect(a.angefangen).toBe(20_000)
    expect(a.anzahl).toEqual({ laufend: 1, abgeschlossen: 3, unterSoll: 1, alle: 4 })
  })
})
