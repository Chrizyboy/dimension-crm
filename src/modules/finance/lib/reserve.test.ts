import { describe, expect, it } from 'vitest'
import type { Bewegung, Woche } from '../types'
import { knappeWoche } from './reserve'

const b = (rappen: number, richtung: 1 | -1, titel: string) => ({ rappen, richtung, titel }) as Bewegung
const w = (i: number, ende: number, bewegungen: Bewegung[] = []) => ({ i, kw: 45 + i, ende, bewegungen }) as Woche

describe('Reserve', () => {
  it('findet die erste knappe Woche und schlägt den grössten Eingang vor', () => {
    const k = knappeWoche(
      [w(0, 5_000_000), w(1, 800_000, [b(300_000, 1, 'Rate A')]), w(2, 2_000_000, [b(900_000, 1, 'Rate B')])],
      1_000_000,
    )
    expect(k?.woche.kw).toBe(46)
    expect(k?.fehlt).toBe(200_000)
    expect(k?.vorschlag?.titel).toBe('Rate B')
  })

  it('schaut nur die nächsten vier Wochen an', () => {
    expect(knappeWoche([w(0, 9), w(1, 9), w(2, 9), w(3, 9), w(4, -5)], 0)).toBeNull()
  })
})
