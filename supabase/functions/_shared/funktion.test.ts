import { describe, expect, it } from 'vitest'
import { darf } from './funktion.ts'

const person = (rechte: string[]) => ({ id: 'p', kuerzel: 'p', name: 'P', email: 'p@test.local', rechte })

describe('darf', () => {
  it('«basis» hat jede angemeldete Person, auch ohne besondere Rechte (wie intern.hat_recht)', () => {
    expect(darf(person([]), 'basis')).toBe(true)
  })
  it('besondere Rechte nur, wer sie hat; Admins alles', () => {
    expect(darf(person([]), 'finanzen')).toBe(false)
    expect(darf(person(['finanzen']), 'finanzen')).toBe(true)
    expect(darf(person(['admin']), 'finanzen')).toBe(true)
    expect(darf(person(['preise']), 'admin')).toBe(false)
  })
})
