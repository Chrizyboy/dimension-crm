import { describe, expect, it } from 'vitest'
import { dashMetrics, leadStandort, numVal, offerPerson, offerStandort } from './v233.mjs'
import { zuModulzahl } from './umwandeln.mjs'
import { einwilligungAusMesse } from './schritte/kunden.mjs'

describe('Rechenregeln wie V233', () => {
  it('liest Beträge wie numVal', () => {
    expect(numVal("12'500.00")).toBe(12500)
    expect(numVal('CHF 1’200')).toBe(1200)
    expect(numVal('12,5')).toBe(12.5)
    expect(numVal('')).toBe(0)
  })

  it('Standort: Lead nach Zuständig, bei Andy nach «zugewiesen von», Offerte nach Sprache', () => {
    expect(leadStandort({ zu: 'Bulle' })).toBe('Bulle')
    expect(leadStandort({ zu: 'Andy', zuvon: 'Muri', erst: 'Bulle' })).toBe('Muri')
    expect(leadStandort({ zu: 'Andy', erst: 'Bulle' })).toBe('Bulle')
    expect(offerStandort({ lang: 'fr' })).toBe('Bulle')
    expect(offerStandort({ lang: 'de' })).toBe('Muri')
  })

  it('Verantwortlich: von Hand gewählt, sonst Bulle → Filipe, Termin → Verkäufer, Richtofferte → Andreas', () => {
    const leads = [
      { id: 'L1', tDate: '2026-10-01', tourPerson: 'Chris' },
      { id: 'L2', tDate: null },
    ]
    expect(offerPerson({ id: 'P1', vmanuell: true, verantwortlich: 'Loris', lang: 'fr' }, leads)).toBe('Loris')
    expect(offerPerson({ id: 'P1', verantwortlich: 'Chris', lang: 'fr' }, leads)).toBe('Filipe')
    expect(offerPerson({ id: 'P1', lang: 'de', leadId: 'L1' }, leads)).toBe('Chris')
    expect(offerPerson({ id: 'P1', lang: 'de', leadId: 'L2' }, leads)).toBe('Andreas')
  })

  it('zählt Angenommen mit Vertragswert, sonst Angebotswert', () => {
    const st = {
      leads: [],
      projects: [
        { id: 'P1', statusKey: 'closed', unterzeichnetAm: '2026-10-02', vertragswert: '10810', angebotswert: 10000 },
        { id: 'P2', statusKey: 'done', entscheidAm: '2026-10-03', angebotswert: '5000' },
        { id: 'P3', statusKey: 'lost', entscheidAm: '2026-10-04' },
      ],
    }
    const m = dashMetrics(
      st,
      () => true,
      () => true,
      ['2026-10-01', '2026-10-31'],
      '2026-10-31',
    )
    expect(m.angenommen).toEqual(['P1', 'P2'])
    expect(m.auftragswert).toBe(1581000)
    expect(m.quote).toBe(67)
  })
})

describe('Import-Korrekturen aus dem Abgleich', () => {
  it('Module «24+3» ergeben 27', () => {
    expect(zuModulzahl('24+3')).toBe(27)
    expect(zuModulzahl('18')).toBe(18)
    expect(zuModulzahl('')).toBeNull()
  })

  it('Einwilligung aus dem Messe-Formular, die erste zählt', () => {
    const lead = (/** @type {any} */ messe) => ({ art: /** @type {'lead'} */ ('lead'), datensatz: { messe }, zeit: '' })
    expect(einwilligungAusMesse([lead({ einwilligung: false })])).toBeNull()
    expect(
      einwilligungAusMesse([
        lead({ einwilligung: true, at: '2026-10-23T18:00:00Z', kanal: 'ipad', event: 'Messe Bulle 2026', by: 'Joel' }),
        lead({
          einwilligung: true,
          at: '2026-10-22T15:56:30Z',
          kanal: 'ipad',
          event: 'Messe Bulle 2026',
          herkunft: 'Wettbewerb + Beratung',
          by: 'Chris',
        }),
      ]),
    ).toEqual({
      quelle: 'messe',
      datum: '2026-10-22',
      kanal: 'ipad',
      anlass: 'Messe Bulle 2026',
      formular: 'Wettbewerb + Beratung',
      erfasst_von: 'Chris',
    })
  })
})
