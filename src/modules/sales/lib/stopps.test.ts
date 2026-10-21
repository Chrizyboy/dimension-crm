import { describe, expect, it } from 'vitest'
import { freieFenster } from './stopps'

describe('freieFenster', () => {
  it('findet Lücken zwischen Terminen, in die ein Besuch passt', () => {
    const frei = freieFenster([
      { start: 9 * 60, ende: 10 * 60 },
      { start: 10 * 60 + 30, ende: 12 * 60 },
      { start: 15 * 60, ende: 16 * 60 },
    ])
    expect(frei).toEqual([{ start: 12 * 60, ende: 15 * 60 }])
  })
  it('ist ohne Termine der ganze Arbeitstag', () => {
    expect(freieFenster([])).toEqual([{ start: 480, ende: 1020 }])
  })
})
