import { describe, expect, it } from 'vitest'
import type { Fahrzeug, Frist } from '../types'
import { anstehend, fristStand, heuteZuerich, istFaellig, schlechtester, serviceKmStand, tageBis } from './fristen'

const frist = (art: Frist['art'], faellig_am: string, titel = 'X'): Frist => ({
  art,
  bezug_tabelle: art === 'ausweis' ? 'qualifikationen' : 'fahrzeuge',
  bezug_id: titel,
  titel,
  faellig_am,
  person_id: null,
  standort_id: null,
})

describe('Fristen', () => {
  it('zählt Kalendertage, auch über die Zeitumstellung', () => {
    expect(tageBis('2026-10-26', '2026-10-24')).toBe(2)
    expect(tageBis('2026-10-20', '2026-10-26')).toBe(-6)
  })

  it('heute in Zürich, nicht in UTC', () => {
    expect(heuteZuerich(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27')
  })

  it('ordnet vorbei, bald und später ein', () => {
    expect(fristStand('2026-10-25', '2026-10-26')).toBe('ueberfaellig')
    expect(fristStand('2026-10-26', '2026-10-26')).toBe('bald')
    expect(fristStand('2026-11-25', '2026-10-26')).toBe('bald')
    expect(fristStand('2026-11-26', '2026-10-26')).toBe('ok')
    expect(fristStand(null, '2026-10-26')).toBe('ok')
    expect(fristStand('2026-12-20', '2026-10-26', 60)).toBe('bald')
  })

  it('nimmt den schlechtesten Stand', () => {
    expect(schlechtester(['ok', 'bald'])).toBe('bald')
    expect(schlechtester(['bald', 'ueberfaellig', 'ok'])).toBe('ueberfaellig')
    expect(schlechtester([])).toBe('ok')
  })

  it('meldet Service nach Kilometern', () => {
    expect(serviceKmStand(71_500, 72_000)).toBe('bald')
    expect(serviceKmStand(72_100, 72_000)).toBe('ueberfaellig')
    expect(serviceKmStand(50_000, 72_000)).toBe('ok')
    expect(serviceKmStand(null, 72_000)).toBe('ok')
  })

  it('zeigt Anstehendes mit längerem Vorlauf für Ausweise, früheste zuerst', () => {
    const liste = [
      frist('mfk', '2027-03-01', 'Bus'),
      frist('ausweis', '2026-12-10', 'Kurs'),
      frist('service', '2026-11-01', 'Crafter'),
      frist('pruefung', '2026-09-30', 'Gurt'),
    ]
    expect(anstehend(liste, '2026-10-26', 30, 60).map((f) => f.titel)).toEqual(['Gurt', 'Crafter', 'Kurs'])
  })
})

describe('Fahrzeug fällig', () => {
  const f = {
    naechste_mfk: '2027-05-01',
    naechster_service: '2027-05-01',
    km_stand: 10_000,
    service_km: 30_000,
    ausser_betrieb: false,
  } as Fahrzeug
  it('wenn MFK, Service oder Kilometer anstehen, nie ausser Betrieb', () => {
    expect(istFaellig(f, '2026-10-26')).toBe(false)
    expect(istFaellig({ ...f, naechste_mfk: '2026-11-10' }, '2026-10-26')).toBe(true)
    expect(istFaellig({ ...f, km_stand: 29_500 }, '2026-10-26')).toBe(true)
    expect(istFaellig({ ...f, naechste_mfk: '2026-01-01', ausser_betrieb: true }, '2026-10-26')).toBe(false)
  })
})
