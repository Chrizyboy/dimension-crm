import { describe, expect, it } from 'vitest'
import { dringlichkeit, heuteZuerich } from './faelligkeit'

describe('dringlichkeit', () => {
  it('ordnet Fälligkeiten ein', () => {
    expect(dringlichkeit('2026-10-22', '2026-10-23')).toBe('ueberfaellig')
    expect(dringlichkeit('2026-10-23', '2026-10-23')).toBe('heute')
    expect(dringlichkeit('2026-10-26', '2026-10-23')).toBe('bald')
    expect(dringlichkeit('2026-11-10', '2026-10-23')).toBe('spaeter')
    expect(dringlichkeit(null)).toBe('ohne')
  })
  it('nimmt das Datum in Zürich', () => {
    // 23:30 UTC am 23.10. ist in Zürich schon der 24.10. (Sommerzeit +2)
    expect(heuteZuerich(new Date('2026-10-23T23:30:00Z'))).toBe('2026-10-24')
  })
})
