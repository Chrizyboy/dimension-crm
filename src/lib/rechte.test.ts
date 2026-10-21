import { describe, expect, it } from 'vitest'
import type { MeineAnmeldung } from '@/types/anmeldung'
import type { ModulMeta } from '@/types/modul'
import { darfModul, hatRecht } from './rechte'

const person = (teil: Partial<MeineAnmeldung>): MeineAnmeldung => ({
  id: '1',
  kuerzel: 'vera',
  name: 'Vera',
  email: 'vera@test.local',
  rolle: 'verkauf',
  rolle_name: { de: 'Verkauf', fr: 'Vente' },
  rechte: [],
  bereiche: [],
  sprache: 'de',
  darstellung: null,
  standort_id: null,
  profil: {},
  ...teil,
})
const modul = (teil: Partial<ModulMeta>): ModulMeta => ({
  id: 'sales',
  titel: { de: 'Anfragen', fr: 'Demandes' },
  untertitel: { de: '', fr: '' },
  pfad: '/sales',
  icon: 'users',
  gruppe: 'verkauf',
  phase: 6,
  ...teil,
})

describe('Rechte in der Oberfläche', () => {
  it('Admin hat jedes Recht, «basis» hat jede angemeldete Person', () => {
    expect(hatRecht(person({ rechte: ['admin'] }), 'finanzen')).toBe(true)
    expect(hatRecht(person({}), 'basis')).toBe(true)
    expect(hatRecht(person({}), 'finanzen')).toBe(false)
    expect(hatRecht(null, 'basis')).toBe(false)
  })

  it('zeigt nur freigegebene Bereiche, leere Auswahl heisst alle', () => {
    const vera = person({ bereiche: ['sales'] })
    expect(darfModul(modul({}), vera)).toBe(true)
    expect(darfModul(modul({ id: 'projects' }), vera)).toBe(false)
    expect(darfModul(modul({ id: 'projects' }), person({}))).toBe(true)
  })

  it('«immer» ist für alle da, ein fehlendes Recht verbirgt trotzdem', () => {
    const vera = person({ bereiche: ['sales'] })
    expect(darfModul(modul({ id: 'today', immer: true }), vera)).toBe(true)
    expect(darfModul(modul({ id: 'finance', recht: 'finanzen' }), person({}))).toBe(false)
    expect(darfModul(modul({ id: 'finance', recht: 'finanzen' }), person({ rechte: ['finanzen'] }))).toBe(true)
  })

  it('ohne Datenbank (Vorschau) ist alles sichtbar', () => {
    expect(darfModul(modul({ recht: 'admin' }), null)).toBe(true)
  })
})
