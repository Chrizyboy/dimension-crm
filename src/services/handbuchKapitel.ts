import type { Sprache } from '@/types/modul'

/**
 * Lädt die Handbuch-Kapitel der Bereiche. Jedes Modul trägt sein Kapitel selbst mit
 * (`src/modules/<id>/handbuch.de.md` und `.fr.md`), damit wer einen Bereich ändert, das Kapitel im selben Schritt
 * nachführt (Entscheid 0039). Geladen wird erst beim Öffnen, damit die App nicht grösser startet.
 */
const DATEIEN = import.meta.glob<string>('../modules/*/handbuch.*.md', { query: '?raw', import: 'default' })

function schluessel(pfad: string): { id: string; sprache: string } | null {
  const m = /modules\/([^/]+)\/handbuch\.([a-z]{2})\.md$/.exec(pfad)
  return m ? { id: m[1] ?? '', sprache: m[2] ?? '' } : null
}

/** Ids aller Bereiche, die ein Kapitel in dieser Sprache haben. */
export function kapitelIds(sprache: Sprache): string[] {
  return Object.keys(DATEIEN).flatMap((p) => {
    const s = schluessel(p)
    return s && s.sprache === sprache ? [s.id] : []
  })
}

/** Rohtext eines Kapitels; ohne französische Fassung die deutsche, ohne beide `null`. */
export async function ladeKapitelText(id: string, sprache: Sprache): Promise<string | null> {
  const laden = DATEIEN[`../modules/${id}/handbuch.${sprache}.md`] ?? DATEIEN[`../modules/${id}/handbuch.de.md`]
  return laden ? laden() : null
}

/** Alle Kapitel einer Sprache als Rohtext (für Suche und «Neu»). */
export async function ladeAlleKapitelTexte(sprache: Sprache): Promise<Record<string, string>> {
  const ids = kapitelIds('de')
  const texte = await Promise.all(ids.map((id) => ladeKapitelText(id, sprache)))
  return Object.fromEntries(ids.flatMap((id, i) => (texte[i] ? [[id, texte[i]]] : [])))
}
