import { describe, expect, it } from 'vitest'
import { ausCode, etikettLink, platz, WEB_APP } from './etikett'

const ID = '0f8c2a7e-5b1d-4c3e-9a6f-1d2e3f4a5b6c'

describe('etikett', () => {
  it('nimmt im Browser die eigene Adresse, in der Desktop-App die Web-App', () => {
    expect(etikettLink({ geraet: ID }, { protocol: 'https:', origin: 'https://x.ch', pathname: '/crm/' })).toBe(
      `https://x.ch/crm/#/fleet?ansicht=geraete&geraet=${ID}`,
    )
    expect(etikettLink({ fahrzeug: ID }, { protocol: 'tauri:', origin: 'tauri://localhost', pathname: '/' })).toBe(
      `${WEB_APP}#/fleet?fahrzeug=${ID}`,
    )
  })
  it('liest nur eigene Codes', () => {
    expect(ausCode(`${WEB_APP}#/fleet?ansicht=geraete&geraet=${ID}`)).toEqual({ geraet: ID })
    expect(ausCode(`${WEB_APP}#/fleet?fahrzeug=${ID}`)).toEqual({ fahrzeug: ID })
    expect(ausCode('https://boese.example/#/fleet?geraet=x')).toBeNull()
    expect(ausCode('irgendwas')).toBeNull()
  })
  it('verteilt 24 Etiketten pro Bogen', () => {
    expect(platz(0)).toEqual({ seite: 0, xMm: 0, yMm: 0.5 })
    expect(platz(4)).toMatchObject({ seite: 0, xMm: 70, yMm: 37.5 })
    expect(platz(24).seite).toBe(1)
  })
})
