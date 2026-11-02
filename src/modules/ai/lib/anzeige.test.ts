import { describe, expect, it } from 'vitest'
import { chfAusMillirappen, rechtsbuendig, zellwert } from './anzeige'

describe('zellwert', () => {
  it('zeigt Rappen als CHF und Daten im Schweizer Format', () => {
    expect(zellwert('betrag_rappen', 3895000, 'de')).toBe("CHF 38'950.00")
    expect(zellwert('angebot_am', '2026-10-02', 'de')).toBe('02.10.2026')
    expect(zellwert('faellig_am', '2026-11-05', 'fr')).toBe('05.11.2026')
  })
  it('zeigt leer, ja/nein und Listen', () => {
    expect(zellwert('ort', null, 'de')).toBe('–')
    expect(zellwert('garantie', true, 'de')).toBe('ja')
    expect(zellwert('garantie', false, 'fr')).toBe('non')
    expect(zellwert('interesse', ['pv', 'speicher'], 'de')).toBe('pv, speicher')
    expect(zellwert('nummer', 'OF-2026-0412', 'de')).toBe('OF-2026-0412')
  })
  it('richtet Beträge rechts aus und rechnet Tausendstel-Rappen', () => {
    expect(rechtsbuendig('total_rappen')).toBe(true)
    expect(rechtsbuendig('kunde')).toBe(false)
    expect(chfAusMillirappen(42_000)).toBe('CHF 0.42')
  })
})
