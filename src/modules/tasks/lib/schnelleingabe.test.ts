import { describe, expect, it } from 'vitest'
import { findePerson, leseSchnelleingabe } from './schnelleingabe'

const HEUTE = '2026-11-02' // Montag

describe('Schnelleingabe', () => {
  it('erkennt Datum, Person und wichtig', () => {
    expect(leseSchnelleingabe('Offerte Baumann nachfassen morgen @AM !', HEUTE)).toEqual({
      titel: 'Offerte Baumann nachfassen',
      faellig_am: '2026-11-03',
      person: 'AM',
      wichtig: true,
    })
  })

  it('Wochentag und Datum', () => {
    expect(leseSchnelleingabe('Pronovo prüfen Freitag', HEUTE).faellig_am).toBe('2026-11-06')
    expect(leseSchnelleingabe('Pronovo prüfen montag', HEUTE).faellig_am).toBe('2026-11-09')
    expect(leseSchnelleingabe('MWST 12.11.', HEUTE).faellig_am).toBe('2026-11-12')
    expect(leseSchnelleingabe('Inventur 3.1.', HEUTE).faellig_am).toBe('2027-01-03')
    expect(leseSchnelleingabe('Rappeler demain', HEUTE).faellig_am).toBe('2026-11-03')
  })

  it('lässt gewöhnliche Wörter im Titel', () => {
    const r = leseSchnelleingabe('So schnell wie möglich do it', HEUTE)
    expect(r.titel).toBe('So schnell wie möglich do it')
    expect(r.faellig_am).toBeNull()
    expect(r.wichtig).toBe(false)
  })

  it('findet Personen über Kurzzeichen oder Vornamen', () => {
    const p = [
      { kuerzel: 'loris', name: 'Loris Pisciotta' },
      { kuerzel: 'DS', name: 'Diogo Semedo' },
      { kuerzel: 'DD', name: 'Diogo Dos Santos' },
    ]
    expect(findePerson('lp', p)?.name).toBe('Loris Pisciotta')
    expect(findePerson('Loris', p)?.kuerzel).toBe('loris')
    expect(findePerson('dd', p)?.name).toBe('Diogo Dos Santos')
    expect(findePerson('Diogo', p)).toBeNull()
  })
})
