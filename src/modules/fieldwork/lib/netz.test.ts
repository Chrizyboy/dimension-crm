import { describe, expect, it } from 'vitest'
import { istNetzFehler, istSchonDa } from './netz'

describe('Netz oder Fehler?', () => {
  it('erkennt Funklöcher', () => {
    expect(istNetzFehler({ message: 'TypeError: Failed to fetch', code: '' })).toBe(true)
    expect(istNetzFehler({ message: 'Load failed' })).toBe(true)
    expect(istNetzFehler({ name: 'StorageUnknownError', message: 'x' })).toBe(true)
    expect(istNetzFehler({ message: 'Bad gateway', status: 502 })).toBe(true)
    expect(istNetzFehler({ message: 'JWT expired', code: 'PGRST301' })).toBe(true)
    expect(istNetzFehler(new Error('egal'), false)).toBe(true)
  })

  it('lässt Antworten der Datenbank als Fehler stehen', () => {
    expect(istNetzFehler({ message: 'baustelle.arbeiten_fehlen', code: 'P0001' })).toBe(false)
    expect(istNetzFehler({ message: 'new row violates row-level security policy', code: '42501' })).toBe(false)
    expect(istNetzFehler(null)).toBe(false)
  })

  it('erkennt doppelt Gesendetes', () => {
    expect(istSchonDa({ code: '23505', message: 'duplicate key value' })).toBe(true)
    expect(istSchonDa({ statusCode: '409', message: 'The resource already exists' })).toBe(true)
    expect(istSchonDa({ code: 'P0001', message: 'baustelle.zeit_zukunft' })).toBe(false)
  })
})
