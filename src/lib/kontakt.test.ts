import { describe, expect, it } from 'vitest'
import { adresseEinzeilig, formatKundennummer, passtZurSuche, telefonZiffern, tonVonFarbe } from './kontakt'

describe('Kontakt-Hilfen', () => {
  it('schreibt Kundennummern wie V233', () => {
    expect(formatKundennummer(7)).toBe('K0007')
    expect(formatKundennummer(12345)).toBe('K12345')
    expect(formatKundennummer(null)).toBe('')
  })

  it('vereinheitlicht Telefonnummern', () => {
    expect(telefonZiffern('+41 76 123 45 67')).toBe('0761234567')
    expect(telefonZiffern('0041 76 123 45 67')).toBe('0761234567')
    expect(telefonZiffern('076 123 45 67')).toBe('0761234567')
    expect(telefonZiffern(null)).toBe('')
  })

  it('findet über Wörter in beliebiger Reihenfolge und über Telefon', () => {
    const k = { suchtext: 'anna muster dorfstrasse 1 5630 muri k0042 101056', telefonZiffern: '0761234567' }
    expect(passtZurSuche(k, 'Muri Anna')).toBe(true)
    expect(passtZurSuche(k, 'k0042')).toBe(true)
    expect(passtZurSuche(k, '076 123')).toBe(true)
    expect(passtZurSuche(k, '+41 76 123 45')).toBe(true)
    expect(passtZurSuche(k, 'Muri 076')).toBe(true)
    expect(passtZurSuche(k, 'Muri 079')).toBe(false)
    expect(passtZurSuche(k, 'bulle')).toBe(false)
    expect(passtZurSuche(k, '99')).toBe(false)
    expect(passtZurSuche(k, '')).toBe(true)
  })

  it('übersetzt Farben in Badge-Töne und Adressen in eine Zeile', () => {
    expect(tonVonFarbe('warn')).toBe('warnung')
    expect(tonVonFarbe(null)).toBe('neutral')
    expect(adresseEinzeilig({ strasse: 'Dorfstrasse 1', plz: '5630', ort: 'Muri' })).toBe('Dorfstrasse 1, 5630 Muri')
    expect(adresseEinzeilig({ strasse: null, plz: null, ort: 'Bulle' })).toBe('Bulle')
  })
})
