import { describe, expect, it } from 'vitest'
import { festeQuelle, istMesseOhneWunsch, mwstAusVorlage, werkvertragBetrag } from './entscheide.mjs'

describe('Entscheide zum Import', () => {
  it('Messe ohne Beratungswunsch bleibt nur Kontakt (15B: Besuch, Anruf, Mail sind Leads)', () => {
    expect(istMesseOhneWunsch({ messe: { wunsch: [] } })).toBe(true)
    expect(istMesseOhneWunsch({ messe: {} })).toBe(true)
    expect(istMesseOhneWunsch({ messe: { wunsch: ['mail'] } })).toBe(false)
    expect(istMesseOhneWunsch({ messe: { wunsch: ['visit'] } })).toBe(false)
    expect(istMesseOhneWunsch({ src: 'solar-guide.ch' })).toBe(false)
  })

  it('Monitor-Leads sind «Ausschreibung», Messe-Formulare «Messe»', () => {
    expect(festeQuelle({ monitorNr: '20261019-01', src: 'Sonstiges' })).toBe('ausschreibung')
    expect(festeQuelle({ src: 'Messe: Beratungsanfrage' })).toBe('messe')
    expect(festeQuelle({ src: 'Nachfassen' })).toBeNull()
  })

  it('Werkvertrag ohne Vertragswert: Angebot plus MWST, gerundet auf Rappen', () => {
    expect(werkvertragBetrag({ vertragswert: '27000', angebotswert: 25000 }, 8.1)).toEqual({
      betrag: 2700000,
      mwstErgaenzt: false,
    })
    expect(werkvertragBetrag({ angebotswert: "12'345.55" }, 8.1)).toEqual({ betrag: 1334554, mwstErgaenzt: true })
    expect(werkvertragBetrag({}, 8.1)).toEqual({ betrag: null, mwstErgaenzt: false })
    expect(mwstAusVorlage({ main: { mwst: 7.7 } })).toBe(7.7)
    expect(mwstAusVorlage(undefined)).toBe(8.1)
  })
})
