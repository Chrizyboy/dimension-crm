import { describe, expect, it } from 'vitest'
import { eingabeAnwenden } from './monteur'
import type { Rapport } from '../types'

const rapport = { id: 'r1', arbeiten: 'alt', pruefpunkte: { isolation: '200' } } as unknown as Rapport

describe('eingabeAnwenden', () => {
  it('führt Prüfpunkte zusammen und ersetzt andere Felder', () => {
    const neu = eingabeAnwenden(rapport, { arbeiten: 'neu', pruefpunkte: { erdung: true } })
    expect(neu.arbeiten).toBe('neu')
    expect(neu.pruefpunkte).toEqual({ isolation: '200', erdung: true })
  })

  it('lässt Prüfpunkte stehen, wenn keine gesendet werden', () => {
    expect(eingabeAnwenden(rapport, { arbeiten: 'x' }).pruefpunkte).toEqual({ isolation: '200' })
  })
})
