import { describe, expect, it } from 'vitest'
import type { Fahrzeug } from '../types'
import { alsFormular, ausFormular } from './fahrzeugFelder'

describe('Fahrzeug-Formular', () => {
  it('wandelt Franken, Zahlen, Schalter und Kennzeichen um', () => {
    const w = alsFormular(null)
    Object.assign(w, {
      bezeichnung: 'Crafter',
      kennzeichen: 'ag 437 112',
      km_stand: "84'200",
      leasing_rate_rappen: '689.00',
    })
    const { werte, fehler } = ausFormular(w, true, '2026-11-02')
    expect(fehler).toEqual([])
    expect(werte).toMatchObject({
      kennzeichen: 'AG 437 112',
      km_stand: 84200,
      km_stand_am: '2026-11-02',
      leasing_rate_rappen: 68900,
      art: 'lieferwagen',
      treibstoff: null,
    })
  })
  it('meldet ungültige Felder und lässt beim Ändern die Fristen weg', () => {
    const f = { bezeichnung: 'Bus', kennzeichen: 'FR 1', art: 'pw', naechste_mfk: '2027-01-01' } as Fahrzeug
    const w = { ...alsFormular(f), nutzlast_kg: 'viel', praemie_rappen: 'x' }
    const r = ausFormular(w, false, '2026-11-02')
    expect(r.fehler).toEqual(['nutzlast_kg', 'praemie_rappen'])
    expect('naechste_mfk' in r.werte).toBe(false)
    expect(ausFormular({ ...alsFormular(f), ausser_betrieb: 'ja' }, false, '2026-11-02').werte.ausser_betrieb).toBe(
      true,
    )
    expect(ausFormular({ ...alsFormular(null), bezeichnung: '' }, true, '2026-11-02').fehler).toContain('bezeichnung')
  })
})
