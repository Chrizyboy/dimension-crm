import { describe, expect, it } from 'vitest'
import type { Fahrzeug, Geraet } from '../types'
import { zuErledigen } from './erledigen'

const fz = (teil: Partial<Fahrzeug>) =>
  ({
    id: 'f1',
    kennzeichen: 'AG 1',
    bezeichnung: 'Bus',
    art: 'lieferwagen',
    person_id: null,
    km_stand: 10000,
    km_stand_am: '2026-11-01',
    service_km: null,
    ausser_betrieb: false,
    ...teil,
  }) as Fahrzeug
const ge = (teil: Partial<Geraet>) =>
  ({ id: 'g1', bezeichnung: 'Lift', inventar_nr: 'HG-1', person_id: null, ...teil }) as Geraet
const leer = { fahrzeuge: [], geraete: [], fristen: [], schaeden: [], belegung: [], heute: '2026-11-05' }

describe('zuErledigen', () => {
  it('Fristen: überfällig kritisch, im Vorlauf Warnung, später nichts, Ausweise nicht', () => {
    const f = (art: 'mfk' | 'ausweis', faellig_am: string) => ({
      art,
      bezug_tabelle: 'fahrzeuge' as const,
      bezug_id: faellig_am,
      titel: 'Bus',
      faellig_am,
      person_id: null,
      standort_id: null,
    })
    const r = zuErledigen({
      ...leer,
      fristen: [f('mfk', '2026-11-20'), f('mfk', '2026-10-12'), f('mfk', '2027-03-01'), f('ausweis', '2026-10-01')],
    })
    expect(r.map((a) => [a.ton, a.angaben.datum])).toEqual([
      ['kritisch', '2026-10-12'],
      ['warnung', '2026-11-20'],
    ])
  })
  it('Kilometerstand fehlt ab dem 3. des Monats, nicht bei Anhängern oder ohne Person', () => {
    const r = zuErledigen({
      ...leer,
      fahrzeuge: [
        fz({ id: 'a', person_id: 'p', km_stand_am: '2026-10-28' }),
        fz({ id: 'b', person_id: 'p', km_stand_am: '2026-10-28', art: 'anhaenger' }),
        fz({ id: 'c', km_stand_am: '2026-10-28' }),
        fz({ id: 'd', person_id: 'p', km_stand_am: '2026-11-02' }),
      ],
    })
    expect(r.map((a) => `${a.art}:${a.fahrzeug_id ?? ''}`)).toEqual(['km_fehlt:a'])
    expect(zuErledigen({ ...leer, heute: '2026-11-02', fahrzeuge: [fz({ person_id: 'p' })] })).toEqual([])
  })
  it('Service nach Kilometern und Gerät lange weg', () => {
    const r = zuErledigen({
      ...leer,
      fahrzeuge: [fz({ service_km: 10500 })],
      geraete: [ge({ person_id: 'p', uebernommen_am: '2026-09-01T08:00:00Z' }), ge({ id: 'g2', person_id: 'p' })],
    })
    expect(r.map((a) => a.art)).toEqual(['service_km', 'lange_weg'])
  })
})
