import { describe, expect, it } from 'vitest'
import { feiertageLesen } from './schutz'

describe('feiertageLesen', () => {
  it('liest Schweizer und ISO-Daten, sortiert, ohne Doppelte', () => {
    expect(feiertageLesen('25.12.2026\n2026-08-01, 1.8.2026\n\n')).toEqual({
      daten: ['2026-08-01', '2026-12-25'],
      falsch: [],
    })
  })
  it('meldet Unlesbares und unmögliche Daten', () => {
    expect(feiertageLesen('31.02.2026\nWeihnachten').falsch).toEqual(['31.02.2026', 'Weihnachten'])
  })
})
