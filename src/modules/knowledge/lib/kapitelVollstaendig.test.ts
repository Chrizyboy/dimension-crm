import { describe, expect, it } from 'vitest'
import { leseKapitel, neuigkeiten, PFLICHT_ABSCHNITTE, type Kapitel } from './kapitel'

/**
 * Wächter für das Handbuch (Entscheid 0043): Jeder Bereich trägt sein Kapitel in DE und FR, beide gleich gebaut.
 * Ändert jemand einen Bereich und vergisst das Kapitel nicht ganz, fällt zumindest eine fehlende Sprache, ein
 * fehlender Abschnitt oder ein toter Link hier auf.
 */
const TEXTE = import.meta.glob<string>('/src/modules/*/handbuch.*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const MODULE = Object.keys(import.meta.glob('/src/modules/*/index.ts')).map(
  (p) => /modules\/([^/]+)\//.exec(p)?.[1] ?? '',
)
const INHALT = import.meta.glob<string>('/src/modules/knowledge/inhalt/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const ROLLEN = new Set([
  'verkauf',
  'innendienst',
  'projektleitung',
  'montage',
  'buchhaltung',
  'geschaeftsleitung',
  'administration',
])

function kapitel(id: string, sprache: 'de' | 'fr'): Kapitel {
  const text = TEXTE[`/src/modules/${id}/handbuch.${sprache}.md`]
  if (text === undefined) throw new Error(`${id}: handbuch.${sprache}.md fehlt`)
  return leseKapitel(id, text)
}

/** Aufbau ohne Wortlaut: Abschnitts-Schlüssel, Anzahl Anleitungen und Anzahl Schritte je Anleitung. */
function bauplan(k: Kapitel) {
  return k.abschnitte.map((a) => ({
    schluessel: a.schluessel,
    unter: a.unter.map((u) => u.bloecke.reduce((n, b) => n + (b.art === 'liste' ? b.punkte.length : 0), 0)),
  }))
}

function links(k: Kapitel): string[] {
  const alles = JSON.stringify(k)
  return [...alles.matchAll(/\]\(kapitel:([a-z0-9-]+)/g)].map((m) => m[1] ?? '')
}

describe('Handbuch-Kapitel', () => {
  it('kennt alle Bereiche', () => {
    expect(MODULE.length).toBeGreaterThan(20)
  })

  describe.each(MODULE)('%s', (id) => {
    it('hat ein deutsches und ein französisches Kapitel mit gleichem Aufbau', () => {
      expect(bauplan(kapitel(id, 'fr'))).toEqual(bauplan(kapitel(id, 'de')))
    })

    it('hat Titel, Stand, Rollen und die Pflicht-Abschnitte', () => {
      for (const sprache of ['de', 'fr'] as const) {
        const k = kapitel(id, sprache)
        expect(k.titel).not.toBe(id)
        expect(k.einleitung.length).toBeGreaterThan(0)
        expect(k.stand).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(Number.isNaN(Date.parse(k.stand ?? ''))).toBe(false)
        expect(k.rollen.length).toBeGreaterThan(0)
        for (const r of k.rollen) expect(ROLLEN, `${id}: Rolle ${r}`).toContain(r)
        const schluessel = k.abschnitte.map((a) => a.schluessel)
        for (const p of PFLICHT_ABSCHNITTE) expect(schluessel, `${id}.${sprache}`).toContain(p)
        expect(k.abschnitte.find((a) => a.schluessel === 'so')?.unter.length).toBeGreaterThan(0)
      }
    })

    it('hat in «Neu» gültige Daten, gleich viele in beiden Sprachen', () => {
      const de = neuigkeiten(kapitel(id, 'de'))
      const fr = neuigkeiten(kapitel(id, 'fr'))
      expect(de.length).toBeGreaterThan(0)
      expect(fr.map((n) => n.datum)).toEqual(de.map((n) => n.datum))
      for (const n of de) expect(Number.isNaN(Date.parse(n.datum))).toBe(false)
    })

    it('verlinkt nur auf bestehende Kapitel', () => {
      for (const sprache of ['de', 'fr'] as const) {
        for (const ziel of links(kapitel(id, sprache))) expect(MODULE, `${id}.${sprache} → ${ziel}`).toContain(ziel)
      }
    })
  })

  it('hat kein Kapitel ohne Bereich', () => {
    const ids = Object.keys(TEXTE).map((p) => /modules\/([^/]+)\//.exec(p)?.[1] ?? '')
    for (const id of ids) expect(MODULE).toContain(id)
  })
})

describe('Rollen-Wege und Begriffe', () => {
  it.each(['rollen', 'begriffe'])('%s: DE und FR gleich gebaut, Links gültig', (name) => {
    const de = INHALT[`/src/modules/knowledge/inhalt/${name}.de.md`]
    const fr = INHALT[`/src/modules/knowledge/inhalt/${name}.fr.md`]
    expect(de).toBeDefined()
    expect(fr).toBeDefined()
    const kde = leseKapitel(name, de ?? '')
    const kfr = leseKapitel(name, fr ?? '')
    const plan = (k: Kapitel) =>
      k.abschnitte.map((a) => [
        a.schluessel,
        a.bloecke.reduce((n, b) => n + (b.art === 'liste' ? b.punkte.length : 1), 0),
      ])
    expect(plan(kfr)).toEqual(plan(kde))
    for (const ziel of [...links(kde), ...links(kfr)]) expect(MODULE).toContain(ziel)
  })

  it('jede Rolle hat einen Weg', () => {
    const k = leseKapitel('rollen', INHALT['/src/modules/knowledge/inhalt/rollen.de.md'] ?? '')
    expect(new Set(k.abschnitte.map((a) => a.schluessel))).toEqual(ROLLEN)
  })
})
