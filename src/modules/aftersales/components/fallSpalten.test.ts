import { describe, expect, it } from 'vitest'
import { offenSeitTagen } from './fallSpalten'

describe('offenSeitTagen', () => {
  const heute = new Date('2026-11-10T09:00:00Z')
  it('zählt ganze Tage seit dem Erfassen', () => {
    expect(offenSeitTagen({ status: 'neu', erstellt_am: '2026-11-02T08:00:00Z' }, heute)).toBe(8)
    expect(offenSeitTagen({ status: 'in_arbeit', erstellt_am: '2026-11-10T08:00:00Z' }, heute)).toBe(0)
  })
  it('erledigte Fälle haben kein Alter', () => {
    expect(offenSeitTagen({ status: 'erledigt', erstellt_am: '2026-10-01T08:00:00Z' }, heute)).toBeNull()
  })
})
