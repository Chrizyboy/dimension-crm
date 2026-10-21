import { describe, expect, it } from 'vitest'
import { kontoAusProfil, kontoSchema } from '../schema'
import type { Einladung, Person } from '../types'
import { statusVon } from './benutzer'

const p = (teil: Partial<Person>): Person => ({
  id: '1',
  kuerzel: 'nora',
  name: 'Nora',
  email: 'nora@test.local',
  rolle: 'montage',
  rechte: [],
  bereiche: [],
  aktiv: true,
  sprache: 'de',
  standort_id: null,
  zuletzt_aktiv: null,
  auth_user_id: null,
  profil: {},
  ...teil,
})
const einladung = (teil: Partial<Einladung>): Einladung => ({
  id: 'e',
  email: 'nora@test.local',
  gueltig_bis: '2099-01-01T00:00:00Z',
  verwendet_am: null,
  widerrufen_am: null,
  erstellt_am: '2026-10-21T00:00:00Z',
  ...teil,
})

describe('Stand einer Person', () => {
  it('unterscheidet aktiv, eingeladen, bereit und deaktiviert', () => {
    expect(statusVon(p({ aktiv: false }), [])).toBe('deaktiviert')
    expect(statusVon(p({ zuletzt_aktiv: '2026-10-21T10:00:00Z' }), [])).toBe('aktiv')
    expect(statusVon(p({}), [einladung({})])).toBe('eingeladen')
    expect(statusVon(p({}), [])).toBe('bereit')
  })

  it('abgelaufene oder widerrufene Einladungen zählen nicht', () => {
    expect(statusVon(p({}), [einladung({ gueltig_bis: '2020-01-01T00:00:00Z' })])).toBe('bereit')
    expect(statusVon(p({}), [einladung({ widerrufen_am: '2026-10-21T00:00:00Z' })])).toBe('bereit')
  })
})

describe('Mein Konto', () => {
  it('übernimmt das Profil aus der Vorlage und ignoriert fremde Felder', () => {
    const werte = kontoAusProfil({ mobil: '+41 76 123 45 67', pensum: 80, updatedBy: 'chris' })
    expect(werte.mobil).toBe('+41 76 123 45 67')
    expect(werte.pensum).toBe('80')
    expect(werte).not.toHaveProperty('updatedBy')
  })

  it('prüft die PLZ (4 Ziffern oder leer)', () => {
    expect(kontoSchema.safeParse({ ...kontoAusProfil({}), plz: '5630' }).success).toBe(true)
    expect(kontoSchema.safeParse({ ...kontoAusProfil({}), plz: '563' }).success).toBe(false)
  })
})
