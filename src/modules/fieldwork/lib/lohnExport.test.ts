import { describe, expect, it } from 'vitest'
import type { Zeit } from '../types'
import { lohnCsv } from './lohnExport'

const zeit = (z: Partial<Zeit>): Zeit => ({
  id: 'x',
  person_id: 'p',
  person: 'Mario Montage',
  person_kuerzel: 'MM',
  projekt_id: null,
  projekt_nummer: 'P-1001',
  rapport_id: null,
  rapport_nummer: 'R0007',
  start: '2026-10-22T05:30:00Z',
  stopp: '2026-10-22T15:00:00Z',
  pause_min: 60,
  art: 'arbeit',
  notiz: null,
  tag: '2026-10-22',
  stunden: 8.5,
  freigegeben_am: null,
  exportiert_am: null,
  ...z,
})

describe('Lohn-Export', () => {
  it('schreibt eine Zeile je Zeit in Schweizer Zeit', () => {
    const csv = lohnCsv([zeit({})])
    const [kopf, zeile] = csv.replace('\uFEFF', '').split('\r\n')
    expect(kopf).toBe('Kürzel;Name;Datum;Start;Stopp;Pause (Min.);Stunden;Art;Projekt;Rapport;Notiz')
    expect(zeile).toBe('MM;Mario Montage;22.10.2026;07:30;17:00;60;8.50;Arbeit;P-1001;R0007;')
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })

  it('lässt laufende Zeiten weg, sortiert und schützt Sonderzeichen', () => {
    const csv = lohnCsv(
      [
        zeit({ id: 'a', person: 'Zoe', person_kuerzel: 'ZZ', notiz: 'Dach; nass' }),
        zeit({ id: 'b', stopp: null }),
        zeit({ id: 'c', person: 'Anna', person_kuerzel: 'AA', art: 'reise' }),
      ],
      'fr',
    )
    const zeilen = csv.trim().split('\r\n')
    expect(zeilen).toHaveLength(3)
    expect(zeilen[1]).toContain('AA;Anna;22.10.2026')
    expect(zeilen[1]).toContain('Déplacement')
    expect(zeilen[2]).toContain('"Dach; nass"')
  })
})
