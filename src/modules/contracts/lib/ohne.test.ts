import { describe, expect, it } from 'vitest'
import type { OhneVertrag } from '../types'
import { ohneFiltern } from './ohne'

const z = (x: Partial<OhneVertrag>): OhneVertrag =>
  ({ anlage_id: 'a', angebot_am: null, angebot_stand: null, ...x }) as OhneVertrag
const heute = new Date('2026-11-02T12:00:00')

describe('Anlagen ohne Vertrag', () => {
  const liste = [
    z({ anlage_id: 'nie' }),
    z({ anlage_id: 'alt', angebot_am: '2026-10-01T09:00:00Z', angebot_stand: 'offen' }),
    z({ anlage_id: 'frisch', angebot_am: '2026-10-30T09:00:00Z', angebot_stand: 'offen' }),
    z({ anlage_id: 'nein', angebot_am: '2026-09-01T09:00:00Z', angebot_stand: 'abgelehnt' }),
  ]
  it('noch nie angeboten', () => {
    expect(ohneFiltern(liste, 'nie', heute).map((x) => x.anlage_id)).toEqual(['nie'])
  })
  it('nachfassen nach 14 Tagen', () => {
    expect(ohneFiltern(liste, 'nachfassen', heute).map((x) => x.anlage_id)).toEqual(['alt'])
  })
  it('alle', () => {
    expect(ohneFiltern(liste, 'alle', heute)).toHaveLength(4)
  })
})
