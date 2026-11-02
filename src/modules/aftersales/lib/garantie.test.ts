import { describe, expect, it } from 'vitest'
import { laufendeGarantien } from './garantie'

const anlage = {
  garantie_bis: '2025-06-21',
  komponenten: [
    {
      art: 'wechselrichter',
      hersteller: 'Huawei',
      modell: '',
      anzahl: 1,
      seriennummer: '',
      garantie_bis: '2031-03-14',
    },
    { art: 'batterie', hersteller: 'BYD', modell: '', anzahl: 1, seriennummer: '', garantie_bis: '2026-01-01' },
  ],
}

describe('laufendeGarantien', () => {
  it('nimmt nur, was am Tag noch läuft', () => {
    expect(laufendeGarantien(anlage, null, '2026-11-02')).toEqual([
      { art: 'wechselrichter', hersteller: 'Huawei', bis: '2031-03-14' },
    ])
  })
  it('filtert nach Komponente, Montage zählt immer', () => {
    expect(laufendeGarantien(anlage, 'batterie', '2025-01-01').map((g) => g.art)).toEqual([null, 'batterie'])
  })
  it('ohne Anlage keine Garantie', () => {
    expect(laufendeGarantien(null, null)).toEqual([])
  })
})
