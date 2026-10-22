import { describe, expect, it } from 'vitest'
import { adressText, naviLink, telLink } from './links'

describe('Links für unterwegs', () => {
  it('navigiert mit Koordinaten oder Adresse', () => {
    expect(naviLink({ strasse: 'Rue A 1', plz: '1630', ort: 'Bulle', breite: 46.6, laenge: 7.05 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=46.6,7.05',
    )
    expect(naviLink({ strasse: 'Rue A 1', plz: '1630', ort: 'Bulle', breite: null, laenge: null })).toContain(
      'Rue%20A%201%2C%201630%20Bulle',
    )
    expect(naviLink({ strasse: null, plz: null, ort: null, breite: null, laenge: null })).toBeNull()
  })

  it('macht Telefonnummern wählbar', () => {
    expect(telLink('+41 76 123 45 67')).toBe('tel:+41761234567')
    expect(telLink(null)).toBeNull()
  })

  it('schreibt Adressen einzeilig', () => {
    expect(adressText({ strasse: 'Weg 2', plz: '5630', ort: 'Muri' })).toBe('Weg 2, 5630 Muri')
    expect(adressText({ strasse: null, plz: null, ort: 'Muri' })).toBe('Muri')
  })
})
