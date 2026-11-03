import { describe, expect, it } from 'vitest'
import { dringlichkeit, sammelKandidaten } from './sammel'

describe('sammelKandidaten', () => {
  it('nur Lieferanten mit mehreren Entwürfen ans selbe Lager', () => {
    const b = (lieferant_id: string, lagerort_id: string | null, status = 'entwurf') => ({
      status: status as 'entwurf',
      lieferant_id,
      lieferant: lieferant_id.toUpperCase(),
      lagerort_id,
    })
    expect(sammelKandidaten([b('t', 'l'), b('t', 'l'), b('k', 'l'), b('t', null), b('t', 'l', 'bestellt')])).toEqual([
      { lieferant_id: 't', lieferant: 'T', lagerort_id: 'l', anzahl: 2 },
    ])
  })
})

describe('dringlichkeit', () => {
  it('vorbei, bald, später', () => {
    expect(dringlichkeit('2026-11-01', '2026-11-05')).toBe('vorbei')
    expect(dringlichkeit('2026-11-07', '2026-11-05')).toBe('bald')
    expect(dringlichkeit('2026-11-20', '2026-11-05')).toBe('spaeter')
    expect(dringlichkeit(null, '2026-11-05')).toBeNull()
  })
})
