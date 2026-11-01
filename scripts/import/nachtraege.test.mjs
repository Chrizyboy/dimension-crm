import { describe, expect, it } from 'vitest'
import { ergaenzeAusVertraegen, fuegeNachtraegeEin } from './nachtraege.mjs'

/** @returns {any} */
const vorlage = () => ({
  at: '2026-10-31T09:00:00Z',
  cols: {
    meta: { counters: { kundenSeq: 700 } },
    leads: {},
    projects: { P1: { nr: 101143, kundenNr: 12, nameMO: 'Bosson', ort: 'Farvagny', statusKey: 'done' } },
  },
})

describe('Aufträge aus der Ablage', () => {
  it('legt Aufträge an, nimmt bekannte Kunden und zählt neue Kundennummern weiter', () => {
    const d = vorlage()
    fuegeNachtraegeEin(d, [
      {
        ordner: '100514 - Bosson à Farvagny',
        jahr: 2023,
        nummer: '100514',
        name: 'Bosson',
        ort: 'Farvagny',
        betrag_inkl_chf: 38500,
      },
      { ordner: 'Baechler - Villa', jahr: 2023, nummer: null, name: 'Baechler', ort: 'Corminboeuf' },
      { ordner: '101143 doppelt', jahr: 2026, nummer: '101143' },
    ])
    expect(d.cols.projects['ablage:100514']).toMatchObject({
      nr: 100514,
      kundenNr: 12,
      vertragswert: 38500,
      statusKey: 'closed',
    })
    expect(d.cols.projects['ablage:Baechler - Villa']).toMatchObject({ kundenNr: 701, lang: 'fr', standort: 'Bulle' })
    expect(d.cols.meta.counters.kundenSeq).toBe(701)
    expect(Object.keys(d.cols.projects)).toHaveLength(3)
  })

  it('ergänzt nur, was in der Vorlage fehlt', () => {
    const p = {
      A: { nr: 'hyd-90', vertragswert: 0 },
      B: { nr: 101538, unterzeichnetAm: '2024-05-05', vertragswert: 38475 },
    }
    ergaenzeAusVertraegen(p, [
      { nummer: 'HYD-90', unterschrieben_am: '2026-03-01', betrag_inkl_chf: 50000, betrag_exkl_chf: 46253.47 },
      { nummer: '101538', unterschrieben_am: '2025-01-01', betrag_inkl_chf: 1 },
    ])
    expect(p.A).toMatchObject({ unterzeichnetAm: '2026-03-01', vertragswert: 50000, angebotswert: 46253.47 })
    expect(p.B).toMatchObject({ unterzeichnetAm: '2024-05-05', vertragswert: 38475 })
  })
})
