import { describe, expect, it } from 'vitest'
import type { Projekt } from '../types'
import { blockerVon, materialBis } from './blocker'

const stand = (spaet: boolean, bewSpaet = 0): NonNullable<Projekt['stand']> => ({
  erledigt: 0,
  gesamt: 21,
  spaet,
  bewilligungen_offen: 1,
  bewilligungen_spaet: bewSpaet,
  checkliste_erledigt: 0,
  checkliste_gesamt: 0,
  phasen: [],
  naechster: null,
})
const heute = new Date('2026-11-02T09:00:00')

describe('Blocker', () => {
  it('rechnet «bestellen bis» aus Baubeginn und Lieferfrist', () => {
    expect(materialBis('2026-11-20', 14)).toBe('2026-11-06')
    expect(materialBis(null, 14)).toBeNull()
  })

  it('meldet Material erst ab «bestellen bis» und nur, wenn nicht bestellt', () => {
    const p = { status: 'im_bau', stand: stand(false), baubeginn: '2026-11-10', material_status: null } as const
    expect(blockerVon(p, 14, heute)).toEqual(['material'])
    expect(blockerVon({ ...p, material_status: 'bestellt' }, 14, heute)).toEqual([])
    expect(blockerVon({ ...p, baubeginn: '2026-12-30' }, 14, heute)).toEqual([])
    // Baubeginn vorbei: das ist kein Bestell-Blocker mehr, sondern eine Frage für den Bau
    expect(blockerVon({ ...p, baubeginn: '2026-10-30' }, 14, heute)).toEqual([])
  })

  it('zeigt Bewilligung statt allgemeiner Frist und nichts bei abgeschlossenen Projekten', () => {
    const p = { status: 'auftrag', stand: stand(true, 1), baubeginn: null, material_status: null } as const
    expect(blockerVon(p, 14, heute)).toEqual(['bewilligung'])
    expect(blockerVon({ ...p, stand: stand(true) }, 14, heute)).toEqual(['frist'])
    expect(blockerVon({ ...p, status: 'abgeschlossen' }, 14, heute)).toEqual([])
  })
})
