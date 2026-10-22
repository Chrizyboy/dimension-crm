import { describe, expect, it } from 'vitest'
import type { FahrplanSchritt, Projekt } from '../types'
import { brauchtBewilligung, NAECHSTER_STAND, nachDringlichkeit, schrittDatum, schrittTon } from './fahrplan'

const stand = (offen: number, spaet = 0): NonNullable<Projekt['stand']> => ({
  erledigt: 0,
  gesamt: 21,
  spaet: spaet > 0,
  bewilligungen_offen: offen,
  bewilligungen_spaet: spaet,
  checkliste_erledigt: 0,
  checkliste_gesamt: 7,
  phasen: [],
  naechster: null,
})

const projekt = (p: Partial<Projekt>): Projekt => ({ status: 'auftrag', kunde: 'B', stand: stand(2), ...p }) as Projekt

describe('Fahrplan', () => {
  it('geht beim Klick reihum durch alle Stände', () => {
    let s = NAECHSTER_STAND.offen
    s = NAECHSTER_STAND[s]
    s = NAECHSTER_STAND[s]
    expect(s).toBe('nicht_noetig')
    expect(NAECHSTER_STAND[s]).toBe('offen')
  })

  it('färbt Überfälliges rot, auch wenn es in Arbeit ist', () => {
    expect(schrittTon({ stand: 'teilweise', ueberfaellig: true, bald: false })).toBe('kritisch')
    expect(schrittTon({ stand: 'offen', ueberfaellig: false, bald: true })).toBe('warnung')
    expect(schrittTon({ stand: 'erledigt', ueberfaellig: false, bald: false })).toBe('ok')
  })

  it('zeigt das Datum, das zum Stand passt', () => {
    expect(schrittDatum({ stand: 'erledigt', erledigt_am: '2026-10-01', eingereicht_am: '2026-09-01' })).toBe(
      '2026-10-01',
    )
    expect(schrittDatum({ stand: 'offen', erledigt_am: null, eingereicht_am: '2026-09-01' })).toBeNull()
  })

  it('nimmt laufende Aufträge in die Bewilligungen, alte nur wenn schon etwas läuft', () => {
    const heute = new Date(2026, 9, 22)
    expect(brauchtBewilligung(projekt({ status: 'im_bau' }), [], heute)).toBe(true)
    expect(brauchtBewilligung(projekt({ unterzeichnet_am: '2026-01-10' }), [], heute)).toBe(true)
    expect(brauchtBewilligung(projekt({ unterzeichnet_am: '2024-01-10' }), [], heute)).toBe(false)
    const laeuft = { stand: 'teilweise', eigene_frist: null } as FahrplanSchritt
    expect(brauchtBewilligung(projekt({ unterzeichnet_am: '2024-01-10' }), [laeuft], heute)).toBe(true)
    expect(brauchtBewilligung(projekt({ status: 'im_bau', stand: stand(0) }), [], heute)).toBe(false)
  })

  it('sortiert Überfälliges zuerst', () => {
    const a = projekt({ kunde: 'A' })
    const z = projekt({ kunde: 'Z', stand: stand(1, 1) })
    expect([a, z].sort(nachDringlichkeit).map((p) => p.kunde)).toEqual(['Z', 'A'])
  })
})
