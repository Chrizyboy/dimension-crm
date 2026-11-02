/**
 * Liest ein Handbuch-Kapitel (Markdown mit wenigen, festen Regeln) in eine Struktur, die die App zeichnet.
 *
 * Aufbau einer Kapitel-Datei (`src/modules/<id>/handbuch.de.md`, gleich aufgebaut in `.fr.md`):
 *
 * ```
 * ---
 * stand: 2026-11-02
 * rollen: verkauf, innendienst
 * ---
 * # Titel
 * Einleitung (ein, zwei Absätze).
 * ## So geht's {#so}
 * ### Eine Offerte ausarbeiten
 * 1. Reiter **Neue Offerten** öffnen.
 * ## Neu {#neu}
 * - 02.11.2026: Was neu ist.
 * ```
 *
 * Bewusst kein vollständiges Markdown: nur Absätze, Listen, **Knöpfe/Felder** und [Links](ziel). So bleibt jedes
 * Kapitel gleich gebaut, und der Test kann DE und FR Abschnitt für Abschnitt vergleichen.
 */

export type Block = { art: 'absatz'; text: string } | { art: 'liste'; geordnet: boolean; punkte: string[] }

export interface Unterabschnitt {
  titel: string
  anker: string
  bloecke: Block[]
}

export interface Abschnitt {
  /** Fester Schlüssel aus `{#…}` (z. B. «so», «neu»), gleich in beiden Sprachen. */
  schluessel: string
  titel: string
  bloecke: Block[]
  unter: Unterabschnitt[]
}

export interface Kapitel {
  id: string
  /** Datum im Format JJJJ-MM-TT, an dem das Kapitel zuletzt mit der App abgeglichen wurde. */
  stand: string | null
  /** Rollen-Schlüssel, die hier hauptsächlich arbeiten. */
  rollen: string[]
  titel: string
  einleitung: Block[]
  abschnitte: Abschnitt[]
}

/** Schlüssel, die jedes Kapitel haben muss (prüft der Test). */
export const PFLICHT_ABSCHNITTE = ['so', 'fragen', 'neu'] as const

/** Anker für Links innerhalb einer Seite: «Eine Offerte senden» → «eine-offerte-senden». */
export function anker(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function kopf(text: string): { stand: string | null; rollen: string[]; rest: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!m) return { stand: null, rollen: [], rest: text }
  const werte = new Map<string, string>()
  for (const zeile of (m[1] ?? '').split(/\r?\n/)) {
    const i = zeile.indexOf(':')
    if (i > 0) werte.set(zeile.slice(0, i).trim(), zeile.slice(i + 1).trim())
  }
  const rollen = (werte.get('rollen') ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
  return { stand: werte.get('stand') ?? null, rollen, rest: text.slice(m[0].length) }
}

/** Absätze und Listen aus Zeilen; Folgezeilen eines Listenpunkts (eingerückt) gehören zum Punkt. */
function bloecke(zeilen: string[]): Block[] {
  const aus: Block[] = []
  let absatz: string[] = []
  const schliesse = () => {
    if (absatz.length) aus.push({ art: 'absatz', text: absatz.join(' ') })
    absatz = []
  }
  for (const roh of zeilen) {
    const zeile = roh.trimEnd()
    const punkt = /^\s*(?:([-*])|(\d+)\.)\s+(.*)$/.exec(zeile)
    if (punkt) {
      schliesse()
      const geordnet = punkt[2] !== undefined
      const letzter = aus[aus.length - 1]
      if (letzter?.art === 'liste' && letzter.geordnet === geordnet) letzter.punkte.push(punkt[3] ?? '')
      else aus.push({ art: 'liste', geordnet, punkte: [punkt[3] ?? ''] })
    } else if (!zeile.trim()) {
      schliesse()
    } else {
      const letzter = aus[aus.length - 1]
      if (!absatz.length && /^\s{2,}/.test(zeile) && letzter?.art === 'liste') {
        const i = letzter.punkte.length - 1
        letzter.punkte[i] = `${letzter.punkte[i] ?? ''} ${zeile.trim()}`
      } else absatz.push(zeile.trim())
    }
  }
  schliesse()
  return aus
}

/** Liest ein Kapitel. Fehlt `{#schluessel}`, gilt der Anker des Titels. */
export function leseKapitel(id: string, text: string): Kapitel {
  const { stand, rollen, rest } = kopf(text)
  let titel = id
  const einleitung: string[] = []
  const abschnitte: {
    schluessel: string
    titel: string
    zeilen: string[]
    unter: { titel: string; zeilen: string[] }[]
  }[] = []
  for (const zeile of rest.split(/\r?\n/)) {
    const h = /^(#{1,3})\s+(.*?)\s*(?:\{#([a-z0-9-]+)\})?\s*$/.exec(zeile)
    if (h?.[1] === '#') {
      titel = h[2] ?? id
    } else if (h?.[1] === '##') {
      const t = h[2] ?? ''
      abschnitte.push({ schluessel: h[3] ?? anker(t), titel: t, zeilen: [], unter: [] })
    } else if (h?.[1] === '###' && abschnitte.length) {
      abschnitte[abschnitte.length - 1]?.unter.push({ titel: h[2] ?? '', zeilen: [] })
    } else {
      const a = abschnitte[abschnitte.length - 1]
      const u = a?.unter[a.unter.length - 1]
      if (u) u.zeilen.push(zeile)
      else if (a) a.zeilen.push(zeile)
      else einleitung.push(zeile)
    }
  }
  return {
    id,
    stand,
    rollen,
    titel,
    einleitung: bloecke(einleitung),
    abschnitte: abschnitte.map((a) => ({
      schluessel: a.schluessel,
      titel: a.titel,
      bloecke: bloecke(a.zeilen),
      unter: a.unter.map((u) => ({
        titel: u.titel,
        anker: `${a.schluessel}-${anker(u.titel)}`,
        bloecke: bloecke(u.zeilen),
      })),
    })),
  }
}

/** Ein Stück Text: normal, **hervorgehoben** (Knopf, Feld, Reiter) oder [Link](ziel). */
export type Stueck =
  { art: 'text'; text: string } | { art: 'fett'; text: string } | { art: 'link'; text: string; ziel: string }

/** Zerlegt eine Zeile in Stücke für die Anzeige. */
export function stuecke(text: string): Stueck[] {
  const aus: Stueck[] = []
  const muster = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let pos = 0
  for (const m of text.matchAll(muster)) {
    if (m.index > pos) aus.push({ art: 'text', text: text.slice(pos, m.index) })
    if (m[1] !== undefined) aus.push({ art: 'fett', text: m[1] })
    else aus.push({ art: 'link', text: m[2] ?? '', ziel: m[3] ?? '' })
    pos = m.index + m[0].length
  }
  if (pos < text.length) aus.push({ art: 'text', text: text.slice(pos) })
  return aus
}

/** Text ohne Auszeichnung, für Suche und Vorschau. */
export function nurText(text: string): string {
  return stuecke(text)
    .map((s) => s.text)
    .join('')
}

/** Alle Blöcke als Klartext (Suche). */
export function blockText(b: Block[]): string {
  return b.map((x) => (x.art === 'absatz' ? nurText(x.text) : x.punkte.map(nurText).join(' '))).join(' ')
}

/** Ein Eintrag aus «Neu»: «- 02.11.2026: Text» → Datum (ISO) und Text. */
export interface Neuigkeit {
  datum: string
  text: string
}

/** Liest die Einträge im Abschnitt «neu»; Zeilen ohne gültiges Datum fallen weg. */
export function neuigkeiten(k: Kapitel): Neuigkeit[] {
  const a = k.abschnitte.find((x) => x.schluessel === 'neu')
  if (!a) return []
  return a.bloecke.flatMap((b) =>
    b.art === 'liste'
      ? b.punkte.flatMap((p) => {
          const m = /^(\d{2})\.(\d{2})\.(\d{4})\s*:\s*(.*)$/.exec(p)
          return m ? [{ datum: `${m[3] ?? ''}-${m[2] ?? ''}-${m[1] ?? ''}`, text: m[4] ?? '' }] : []
        })
      : [],
  )
}

/** Ein Suchtreffer in einem Kapitel: Abschnitt bzw. Anleitung mit kurzem Ausschnitt. */
export interface KapitelTreffer {
  kapitel: string
  titel: string
  anker: string | null
  ausschnitt: string
  punkte: number
}

function ausschnitt(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return text.slice(0, 140)
  const von = Math.max(0, i - 50)
  return `${von > 0 ? '…' : ''}${text.slice(von, i + 90)}…`
}

/**
 * Durchsucht ein Kapitel: jede Anleitung (###) und jeder Abschnitt ist ein eigener Treffer, damit man direkt an
 * die richtige Stelle springt. Treffer im Titel zählen mehr als im Text. Alle Wörter müssen vorkommen.
 */
export function sucheImKapitel(k: Kapitel, suche: string): KapitelTreffer[] {
  const woerter = suche.toLowerCase().split(/\s+/).filter(Boolean)
  if (!woerter.length) return []
  const stellen: { titel: string; anker: string | null; text: string }[] = [
    { titel: k.titel, anker: null, text: blockText(k.einleitung) },
  ]
  for (const a of k.abschnitte) {
    stellen.push({ titel: a.titel, anker: a.schluessel, text: blockText(a.bloecke) })
    for (const u of a.unter) stellen.push({ titel: u.titel, anker: u.anker, text: blockText(u.bloecke) })
  }
  return stellen.flatMap((s) => {
    const titel = s.titel.toLowerCase()
    const alles = `${k.titel} ${s.titel} ${s.text}`.toLowerCase()
    if (!woerter.every((w) => alles.includes(w))) return []
    const punkte = woerter.reduce(
      (p, w) => p + (titel.includes(w) ? 3 : 0) + (s.text.toLowerCase().includes(w) ? 1 : 0),
      0,
    )
    return [{ kapitel: k.id, titel: s.titel, anker: s.anker, ausschnitt: ausschnitt(s.text, woerter[0] ?? ''), punkte }]
  })
}

/**
 * Adresse eines Links im Kapitel: «kapitel:quotes» (anderes Kapitel, mit «#anker» an eine Stelle),
 * «/sales» (Bereich der App) oder eine Web-Adresse.
 */
export function linkZiel(ziel: string): { href: string; extern: boolean } {
  if (ziel.startsWith('kapitel:')) {
    const [id = '', stelle] = ziel.slice(8).split('#')
    return { href: `#/knowledge?ansicht=kapitel&kapitel=${id}${stelle ? `&stelle=${stelle}` : ''}`, extern: false }
  }
  if (ziel.startsWith('/')) return { href: `#${ziel}`, extern: false }
  return { href: ziel, extern: /^https?:\/\//.test(ziel) }
}
