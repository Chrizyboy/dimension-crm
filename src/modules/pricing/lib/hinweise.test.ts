import { describe, expect, it } from 'vitest'
import type { Artikel } from '../types'
import { hinweise } from './hinweise'

const a = (p: Partial<Artikel>): Artikel =>
  ({
    kategorie: 'batteriespeicher',
    marge: 0.18,
    ekRappen: 415000,
    vkRappen: 497066,
    ekStand: '2026-10-03',
    datenblaetter: { de: 'x', fr: 'y' },
    lagerFrei: 0,
    ...p,
  }) as Artikel
const regeln = { kategorien: { batteriespeicher: { marge: 0.18, mindest: 0.12 } }, ek_gueltig_tage: 90 }
const heute = new Date('2026-11-02')

describe('Handlungsbedarf', () => {
  it('meldet nichts, wenn alles stimmt', () => {
    expect(hinweise(a({}), regeln, heute)).toEqual([])
  })
  it('meldet tiefe Marge, alten Einkauf, fehlendes Datenblatt und Lager', () => {
    expect(
      hinweise(a({ marge: 0.1, ekStand: '2026-06-14', datenblaetter: { de: 'x' }, lagerFrei: 3 }), regeln, heute),
    ).toEqual(['marge', 'ekAlt', 'datenblatt', 'lager'])
  })
  it('zeigt ohne Recht «preise» nur Datenblatt und Lager', () => {
    expect(hinweise(a({ marge: null, ekRappen: null, ekStand: null, lagerFrei: 2 }), undefined, heute)).toEqual([
      'lager',
    ])
  })
})
