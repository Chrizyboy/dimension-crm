import { describe, expect, it } from 'vitest'
import { ausweisLuecken, taetigkeitPflichten, type AusweisStand } from './ausweise'

const pflichten = taetigkeitPflichten([
  { schluessel: 'ersthelfer', eigenschaften: { ausweise: ['erste_hilfe'], wer: 'einer', immer: true } },
  { schluessel: 'hebebuehne', eigenschaften: { ausweise: ['hebebuehne'], wer: 'alle' } },
  { schluessel: 'leer', eigenschaften: {} },
])
const ausweise: AusweisStand[] = [
  { person_id: 'mia', art: 'erste_hilfe', gueltig_bis: null },
  { person_id: 'mia', art: 'hebebuehne', gueltig_bis: '2026-11-25' },
]
const einsatz = (personen: string[], taetigkeiten: string[] = [], art: 'intern' | 'extern' = 'intern') => ({
  art,
  bis: '2026-11-26',
  personen,
  taetigkeiten,
})

describe('ausweisLuecken', () => {
  it('Ersthelfer gilt immer, einer genügt', () => {
    expect(ausweisLuecken(einsatz(['mia', 'max']), pflichten, ausweise)).toEqual([])
    expect(ausweisLuecken(einsatz(['max']), pflichten, ausweise)).toEqual([
      { taetigkeit: 'ersthelfer', wer: 'einer', fehlt: [] },
    ])
  })
  it('«alle»: wem der Ausweis fehlt oder vor Einsatzende abläuft', () => {
    expect(ausweisLuecken(einsatz(['mia', 'max'], ['hebebuehne']), pflichten, ausweise)).toEqual([
      { taetigkeit: 'hebebuehne', wer: 'alle', fehlt: ['mia', 'max'] },
    ])
  })
  it('Subunternehmer und leeres Team ohne Warnung', () => {
    expect(ausweisLuecken(einsatz(['max'], ['hebebuehne'], 'extern'), pflichten, ausweise)).toEqual([])
    expect(ausweisLuecken(einsatz([]), pflichten, ausweise)).toEqual([])
  })
})
