import { describe, expect, it } from 'vitest'
import { bereinigen } from './scannen'

describe('bereinigen', () => {
  it('nimmt die Nummer aus «SN:»-Codes', () => {
    expect(bereinigen('Huawei SUN2000 SN: hv2241 00123')).toBe('HV2241')
    expect(bereinigen('S/N 7A1B-22')).toBe('7A1B-22')
  })
  it('lässt reine Nummern, ohne Leerzeichen und gross', () => {
    expect(bereinigen(' ab 12 34 ')).toBe('AB1234')
  })
})
