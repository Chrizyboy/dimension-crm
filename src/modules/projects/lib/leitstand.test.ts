import { describe, expect, it } from 'vitest'
import type { PhasenStand, Projekt, Signale } from '../types'
import { aktuellePhase, hinweise, nachPhase, nochOffen, trifft, woche } from './leitstand'

const phasen = (offen: string): PhasenStand[] =>
  ['auftrag', 'bew', 'vorb', 'montage', 'ibn', 'abschluss'].map((phase, i, alle) => ({
    phase: phase as PhasenStand['phase'],
    gesamt: 2,
    erledigt: i < alle.indexOf(offen) ? 2 : 0,
    teilweise: false,
    spaet: false,
  }))

const projekt = (x: Partial<Projekt>): Projekt =>
  ({
    id: 'p1',
    status: 'im_bau',
    bau_status: 'terminiert',
    baubeginn: '2026-11-11',
    material_status: 'bestellt',
    stand: null,
    ...x,
  }) as Projekt

const signale = (x: Partial<Signale>): Signale => ({
  projekt_id: 'p1',
  verantwortlich_id: null,
  material_fehlt: 0,
  material_positionen: 0,
  letzte_lieferung: null,
  naechster_einsatz: null,
  letzte_aktivitaet: null,
  tranchen_faellig_rappen: 0,
  offen_rappen: 0,
  offen_faellig_am: null,
  nachtraege_offen: 0,
  ...x,
})

const stand = (offen: string, extra: Partial<NonNullable<Projekt['stand']>> = {}): Projekt['stand'] => ({
  erledigt: 3,
  gesamt: 12,
  spaet: false,
  bewilligungen_offen: 1,
  bewilligungen_spaet: 0,
  checkliste_erledigt: 0,
  checkliste_gesamt: 0,
  phasen: phasen(offen),
  naechster: null,
  ...extra,
})

describe('aktuellePhase', () => {
  it('nimmt die erste Phase mit offenen Schritten', () => {
    expect(aktuellePhase(projekt({ stand: stand('bew') }))).toBe('bew')
    expect(aktuellePhase(projekt({ stand: stand('montage') }))).toBe('montage')
  })
  it('ohne Fahrplan zählt der Baustellen-Status', () => {
    expect(aktuellePhase(projekt({ status: 'auftrag' }))).toBe('auftrag')
    expect(aktuellePhase(projekt({ bau_status: 'ibn' }))).toBe('ibn')
    expect(aktuellePhase(projekt({}))).toBe('vorb')
  })
})

describe('hinweise', () => {
  const heute = '2026-11-02'
  it('meldet fehlendes Material nur, wenn der Bau in 14 Tagen ist', () => {
    const s = signale({ material_fehlt: 2, material_positionen: 5 })
    expect(hinweise(projekt({}), s, heute)[0]).toMatchObject({ schluessel: 'material_fehlt', ton: 'kritisch' })
    expect(hinweise(projekt({ baubeginn: '2026-12-20' }), s, heute).map((h) => h.schluessel)).not.toContain(
      'material_fehlt',
    )
  })
  it('meldet fehlenden Bautermin, fällige Tranche und komplettes Material', () => {
    const s = signale({ tranchen_faellig_rappen: 100, material_positionen: 3 })
    expect(hinweise(projekt({ baubeginn: null }), s, heute).map((h) => h.schluessel)).toEqual([
      'ohne_termin',
      'verrechnen',
      'material_ok',
    ])
  })
  it('meldet nicht bestelltes Material ab «bestellen bis» und vorbeigegangene Fristen', () => {
    const p = projekt({ material_status: null, stand: stand('vorb', { spaet: true }) })
    expect(hinweise(p, undefined, heute).map((h) => h.schluessel)).toEqual(['material_bestellen', 'frist'])
    expect(hinweise(p, undefined, heute, 5).map((h) => h.schluessel)).toEqual(['frist'])
  })
  it('meldet überfällige Rechnungen mit Tagen', () => {
    const s = signale({ offen_rappen: 500, offen_faellig_am: '2026-10-20' })
    expect(hinweise(projekt({}), s, heute)[0]).toMatchObject({
      schluessel: 'zahlung_ueberfaellig',
      werte: { tage: 13 },
    })
  })
})

describe('trifft und nachPhase', () => {
  const heute = '2026-11-02'
  it('filtert meine Projekte über die Projektleitung', () => {
    expect(trifft(projekt({ verantwortlich_id: 'a' }), undefined, 'meine', 'a', heute)).toBe(true)
    expect(trifft(projekt({ verantwortlich_id: 'b' }), undefined, 'meine', 'a', heute)).toBe(false)
    expect(trifft(projekt({ verantwortlich_id: null }), undefined, 'meine', null, heute)).toBe(false)
  })
  it('legt Blockierte zuoberst in die Spalte', () => {
    const a = projekt({ id: 'a', stand: stand('bew'), baubeginn: '2026-11-05' })
    const b = projekt({ id: 'b', stand: stand('bew', { bewilligungen_spaet: 1 }), baubeginn: '2026-12-01' })
    const spalten = nachPhase([a, b], new Map(), heute)
    expect(spalten.bew.map((p) => p.id)).toEqual(['b', 'a'])
  })
  it('zeigt Abgeschlossene nur ein halbes Jahr und nur mit offenen Schritten', () => {
    const offen = stand('abschluss')
    expect(nochOffen(projekt({ status: 'abgeschlossen', baubeginn: '2026-09-01', stand: offen }), heute)).toBe(true)
    expect(nochOffen(projekt({ status: 'abgeschlossen', baubeginn: '2025-09-01', stand: offen }), heute)).toBe(false)
  })
})

describe('woche', () => {
  it('liefert Montag bis Sonntag', () => {
    expect(woche('2026-11-04')).toEqual({ von: '2026-11-02', bis: '2026-11-08' })
    expect(woche('2026-11-08')).toEqual({ von: '2026-11-02', bis: '2026-11-08' })
  })
})
