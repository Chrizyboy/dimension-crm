import { describe, expect, it } from 'vitest'
import { elcomAbfrage, elcomZeilenLesen, gemeindeLesen } from './elcom.ts'

// Antworten im Aufbau von LINDAS (SPARQL-JSON) und api3.geo.admin.ch, mit erfundenen Betreibern.

describe('ElCom-Verzeichnis', () => {
  it('fragt nach dem Tarifjahr', () => {
    expect(elcomAbfrage(2026)).toContain('FILTER (STR(?periode) = "2026")')
    expect(elcomAbfrage(2026)).toContain('<https://energy.ld.admin.ch/elcom/electricityprice>')
  })

  it('liest Gemeinde, Betreiber und ElCom-Nummer, ohne Doppelte', () => {
    const b = (gemeinde: string, name: string | undefined, betreiber: string, bname: string | undefined) => ({
      gemeinde: { value: `https://ld.admin.ch/municipality/${gemeinde}` },
      ...(name ? { gemeindeName: { value: name } } : {}),
      betreiber: { value: `https://energy.ld.admin.ch/elcom/electricityprice/operator/${betreiber}` },
      ...(bname ? { betreiberName: { value: bname } } : {}),
    })
    expect(
      elcomZeilenLesen({
        results: {
          bindings: [
            b('4236', 'Muri (AG)', '486', 'Beispiel Netz AG'),
            b('4236', 'Muri (AG)', '486', 'Beispiel Netz AG'),
            b('2125', undefined, '17', 'Netz Greyerz'),
            b('2125', 'Bulle', '18', undefined),
            b('x', 'Ohne Nummer', '19', 'Fehler AG'),
          ],
        },
      }),
    ).toEqual([
      { bfs_nr: 4236, gemeinde: 'Muri (AG)', elcom_id: '486', netzbetreiber: 'Beispiel Netz AG' },
      { bfs_nr: 2125, gemeinde: 'BFS 2125', elcom_id: '17', netzbetreiber: 'Netz Greyerz' },
    ])
    expect(elcomZeilenLesen(null)).toEqual([])
  })
})

describe('Gemeinde je PLZ', () => {
  it('nimmt die BFS-Nummer aus dem Feld oder der Objekt-ID', () => {
    expect(gemeindeLesen('5630', { results: [{ id: 4236, attributes: { gemname: 'Muri (AG)' } }] })).toEqual({
      plz: '5630',
      bfs_nr: 4236,
      gemeinde: 'Muri (AG)',
    })
    expect(gemeindeLesen('1630', { results: [{ id: 'x', attributes: { gde_nr: 2125, label: 'Bulle' } }] })).toEqual({
      plz: '1630',
      bfs_nr: 2125,
      gemeinde: 'Bulle',
    })
  })

  it('ohne Treffer bleibt die Gemeinde leer', () => {
    expect(gemeindeLesen('6000', { results: [] })).toEqual({ plz: '6000', bfs_nr: null, gemeinde: null })
  })
})
