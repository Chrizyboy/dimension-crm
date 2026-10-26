import { describe, expect, it } from 'vitest'
import type { Qualifikation } from '../types'
import { ausweisArten, gueltigBisVorschlag, neueste, probleme, zellenStand } from './matrix'

const q = (
  art: string,
  gueltig_bis: string | null,
  erworben_am: string | null = null,
  person_id = 'p1',
): Qualifikation => ({
  id: `${art}-${gueltig_bis ?? 'x'}-${erworben_am ?? ''}`,
  person_id,
  art,
  bezeichnung: null,
  erworben_am,
  gueltig_bis,
  aussteller: null,
  datei_pfad: null,
  notiz: null,
})

const wert = (schluessel: string, eigenschaften: Record<string, unknown>) => ({
  schluessel,
  text_de: schluessel,
  text_fr: schluessel,
  reihenfolge: 1,
  farbe: null,
  eigenschaften,
})
const arten = ausweisArten([wert('absturz', { gueltig_monate: 24, pflicht_fuer: ['montage'] }), wert('b', {})])

describe('Übersicht «wer darf was»', () => {
  it('liest Gültigkeit und Pflicht aus den Daten', () => {
    expect(arten).toEqual([
      { schluessel: 'absturz', gueltig_monate: 24, pflicht_fuer: ['montage'] },
      { schluessel: 'b', gueltig_monate: null, pflicht_fuer: [] },
    ])
  })

  it('nimmt den neusten Eintrag je Art, unbefristet zuerst', () => {
    const k = neueste([q('absturz', '2025-01-01'), q('absturz', '2027-01-01'), q('b', '2030-01-01'), q('b', null)])
    expect(k.get('p1:absturz')?.gueltig_bis).toBe('2027-01-01')
    expect(k.get('p1:b')?.gueltig_bis).toBeNull()
  })

  it('ordnet die Zellen ein', () => {
    const heute = '2026-10-26'
    expect(zellenStand(undefined, true, heute)).toBe('fehlt')
    expect(zellenStand(undefined, false, heute)).toBe('leer')
    expect(zellenStand(q('b', null), false, heute)).toBe('gueltig')
    expect(zellenStand(q('b', '2026-10-25'), false, heute)).toBe('abgelaufen')
    expect(zellenStand(q('b', '2026-12-20'), false, heute)).toBe('bald')
    expect(zellenStand(q('b', '2027-06-01'), false, heute)).toBe('gueltig')
  })

  it('schlägt «gültig bis» vor, auch am Monatsende', () => {
    expect(gueltigBisVorschlag('2026-10-26', 24)).toBe('2028-10-26')
    expect(gueltigBisVorschlag('2027-01-31', 1)).toBe('2027-02-28')
    expect(gueltigBisVorschlag('2026-10-26', null)).toBe('')
    expect(gueltigBisVorschlag('', 12)).toBe('')
  })

  it('zählt fehlende Pflicht und Abgelaufenes', () => {
    const k = neueste([q('b', '2026-01-01')])
    expect(probleme('p1', 'montage', arten, k, '2026-10-26')).toBe(2)
    expect(probleme('p1', 'verkauf', arten, k, '2026-10-26')).toBe(1)
  })
})
