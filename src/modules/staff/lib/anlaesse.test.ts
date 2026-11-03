import { describe, expect, it } from 'vitest'
import type { Auswahlwert } from '@/types/kontakt'
import { taetigkeitRegeln, tageBis } from './anlaesse'

const wert = (schluessel: string, eigenschaften: object) =>
  ({ schluessel, text_de: schluessel, text_fr: schluessel, eigenschaften }) as unknown as Auswahlwert

describe('taetigkeitRegeln', () => {
  it('liest Ausweise, wer und immer mit sicheren Vorgaben', () => {
    expect(
      taetigkeitRegeln([wert('ersthelfer', { ausweise: ['erste_hilfe'], wer: 'einer', immer: true }), wert('x', {})]),
    ).toEqual([
      { schluessel: 'ersthelfer', ausweise: ['erste_hilfe'], wer: 'einer', immer: true },
      { schluessel: 'x', ausweise: [], wer: 'alle', immer: false },
    ])
  })
})

describe('tageBis', () => {
  it('zählt Kalendertage, auch über den Monatswechsel', () => {
    expect(tageBis('2026-11-03', '2026-11-03')).toBe(0)
    expect(tageBis('2026-12-01', '2026-11-29')).toBe(2)
    expect(tageBis('2027-01-01', '2026-12-31')).toBe(1)
  })
})
