import { describe, expect, it } from 'vitest'
import type { TagEintrag } from '../types'
import { zielAusWert, zielOptionen, zielVonZeit, zielWert } from './ziel'

const eintrag = (e: Partial<TagEintrag>): TagEintrag => ({
  typ: 'einsatz',
  id: 'e',
  von: '2026-11-04',
  bis: '2026-11-04',
  zeit: null,
  notiz: null,
  projekt: { id: 'p1', nummer: 'P-2026-118', titel: null, bau_status: 'im_bau', elektriker: null },
  kunde: { name: 'Sophie Morand', telefon: null, email: null, sprache: 'fr' },
  adresse: { strasse: null, plz: '1630', ort: 'Bulle', breite: null, laenge: null },
  team: [],
  material: null,
  rapporte: [],
  ...e,
})

const posten = [{ schluessel: 'lager', de: 'Lager / Werkstatt', fr: 'Dépôt / atelier' }]

describe('Ziel der Zeit', () => {
  it('Wert hin und zurück', () => {
    for (const z of [{ projekt_id: 'a' }, { service_fall_id: 'b' }, { intern: 'lager' }]) {
      expect(zielAusWert(zielWert(z))).toEqual(z)
    }
    expect(zielAusWert('ohne')).toBeNull()
    expect(zielAusWert('')).toBeNull()
  })

  it('heutige Baustelle zuerst, jedes Ziel einmal, dann interne Posten', () => {
    const o = zielOptionen(
      [
        eintrag({
          id: 'morgen',
          von: '2026-11-05',
          bis: '2026-11-05',
          projekt: { id: 'p2', nummer: 'P-2026-097', titel: null, bau_status: 'auftrag', elektriker: null },
        }),
        eintrag({ id: 'heute' }),
        eintrag({ id: 'heute2' }),
        eintrag({
          typ: 'service',
          id: 's',
          projekt: null,
          service: { id: 's1', nummer: 'S-2026-041', titel: null, garantie: true, prioritaet: null, kategorie: null },
          kunde: { name: 'Laurent Pasquier', telefon: null, email: null, sprache: 'fr' },
          adresse: { strasse: null, plz: null, ort: 'Gruyères', breite: null, laenge: null },
        }),
      ],
      posten,
      'fr',
      '2026-11-04',
    )
    expect(o.map((x) => x.wert)).toEqual(['p:p1', 's:s1', 'p:p2', 'i:lager'])
    expect(o[0]?.text).toBe('P-2026-118 · Sophie Morand · Bulle')
    expect(o.at(-1)?.text).toBe('Dépôt / atelier')
  })

  it('Ziel einer bestehenden Zeit', () => {
    expect(zielVonZeit({ projekt_id: 'a', service_fall_id: 'b' })).toEqual({ projekt_id: 'a' })
    expect(zielVonZeit({ intern: 'lager' })).toEqual({ intern: 'lager' })
    expect(zielVonZeit({})).toBeNull()
  })
})
