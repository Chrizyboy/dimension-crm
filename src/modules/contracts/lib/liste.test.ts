import { describe, expect, it } from 'vitest'
import type { Vertrag } from '../types'
import { filtere, kennzahlen, laufzeit, naechsteRechnung } from './liste'

const basis = {
  status: 'aktiv',
  paket: 'comfort',
  start_am: '2023-11-01',
  laufzeit_jahre: 3,
  verrechnet_bis: '2026-10-31',
  gekuendigt_per: null,
  naechste_wartung: '2026-11-20',
  preis_netto_rappen: 34900,
} as unknown as Vertrag

const v = (x: Partial<Vertrag>): Vertrag => ({ ...basis, ...x })

describe('Vertragsliste', () => {
  it('nächste Rechnung = Tag nach «verrechnet bis»', () => {
    expect(naechsteRechnung(basis)).toBe('2026-11-01')
    expect(naechsteRechnung(v({ verrechnet_bis: null }))).toBe('2023-11-01')
    expect(naechsteRechnung(v({ paket: null }))).toBeNull()
    expect(naechsteRechnung(v({ gekuendigt_per: '2026-10-31' }))).toBeNull()
  })
  it('Laufzeit und kündbar bis', () => {
    expect(laufzeit(basis, '2026-11-02', 3)).toEqual({ bis: '2027-10-31', per: '2027-10-31', kuendbar: '2027-07-31' })
    expect(laufzeit(v({ gekuendigt_per: '2027-04-30' }), '2026-11-02', 3)).toEqual({
      bis: '2027-04-30',
      per: '2027-04-30',
      kuendbar: null,
    })
  })
  it('filtert', () => {
    const liste = [
      basis,
      v({ naechste_wartung: '2027-06-01', verrechnet_bis: '2027-05-31' }),
      v({ status: 'gekuendigt' }),
      v({ start_am: '2024-03-01', naechste_wartung: null, verrechnet_bis: '2027-02-28' }),
    ]
    expect(filtere(liste, 'faellig', '2026-11-02')).toHaveLength(1)
    expect(filtere(liste, 'rechnung', '2026-11-02')).toHaveLength(2)
    expect(filtere(liste, 'gekuendigt', '2026-11-02')).toHaveLength(1)
    expect(filtere(liste, 'kuendbar', '2026-11-02')).toHaveLength(1)
    expect(filtere(liste, 'alle', '2026-11-02')).toHaveLength(4)
  })
  it('zählt', () => {
    expect(kennzahlen([basis, v({ status: 'gekuendigt' })], '2026-11-02')).toEqual({
      aktiv: 1,
      wiederkehrend: 34900,
      faellig: 1,
      rechnung: 2,
      gekuendigt: 1,
    })
  })
  it('Kündigungsfrist vorbei: kündbar auf das nächste Ende', () => {
    const x = v({ start_am: '2024-02-01', laufzeit_jahre: 3, gekuendigt_per: null })
    expect(laufzeit(x, '2026-11-02', 3)).toEqual({ bis: '2027-01-31', per: '2028-01-31', kuendbar: '2027-10-31' })
    expect(laufzeit(x, '2026-10-15', 3)).toEqual({ bis: '2027-01-31', per: '2027-01-31', kuendbar: '2026-10-31' })
  })
})
