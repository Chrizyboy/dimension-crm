import { describe, expect, it } from 'vitest'
import { garantieAm } from './garantie'

const k = (art: string, bis: string | null) => ({
  art,
  hersteller: 'H',
  modell: '',
  anzahl: 1,
  seriennummer: '',
  garantie_bis: bis,
})

describe('garantieAm', () => {
  it('ganze Anlage noch in Garantie', () => {
    expect(garantieAm({ garantie_bis: '2028-05-01', komponenten: [] }, '2026-11-10')?.anlage).toBe('2028-05-01')
  })
  it('nur eine Komponente noch in Garantie', () => {
    const g = garantieAm(
      { garantie_bis: '2025-01-01', komponenten: [k('wechselrichter', '2031-03-01'), k('module', '2024-01-01')] },
      '2026-11-10',
    )
    expect(g?.anlage).toBeNull()
    expect(g?.komponenten.map((x) => x.art)).toEqual(['wechselrichter'])
  })
  it('nichts mehr in Garantie', () => {
    expect(garantieAm({ garantie_bis: '2025-01-01', komponenten: [k('module', null)] }, '2026-11-10')).toBeNull()
    expect(garantieAm(null, '2026-11-10')).toBeNull()
  })
})
