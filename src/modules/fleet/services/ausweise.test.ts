import { describe, expect, it } from 'vitest'
import { ausweisFehlt } from './ausweise'

describe('ausweisFehlt', () => {
  it('prüft den nötigen Ausweis; BE und C1 decken B ab', () => {
    expect(ausweisFehlt(null, [])).toBe(false)
    expect(ausweisFehlt('fuehrerausweis_be', ['fuehrerausweis_b'])).toBe(true)
    expect(ausweisFehlt('fuehrerausweis_b', ['fuehrerausweis_be'])).toBe(false)
    expect(ausweisFehlt('fuehrerausweis_b', [])).toBe(true)
  })
})
