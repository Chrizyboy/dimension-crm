import type { HandbuchDatei, HandbuchEintrag, Meldung } from '../types'

/** Nächste Version nach V233-Art: «1.0» → «1.1», «2.9» → «2.10»; sonst leer, die Person trägt sie ein. */
export function naechsteVersion(v: string | null): string {
  const m = /^(\d+)\.(\d+)$/.exec((v ?? '').trim())
  return m ? `${m[1] ?? ''}.${String(Number(m[2]) + 1)}` : ''
}

/** Titel aus dem Dateinamen vorschlagen: «Prozess_Lead-Terminierung_30.09.2026.pdf» → «Lead-Terminierung». */
export function titelAusDateiname(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^(Prozess|Processus)[_\s-]*/i, '')
    .replace(/_+/g, ' ')
    .replace(/\s*\d{2}\.\d{2}\.\d{4}\s*$/, '')
    .trim()
}

/**
 * Was die Person in ihrer Sprache sieht. Ohne französische Datei öffnet sich die deutsche, mit Hinweis
 * (V233 przL): lieber das deutsche PDF als gar keines.
 */
export function fassung(
  e: HandbuchEintrag,
  sprache: 'de' | 'fr',
): { titel: string; beschreibung: string | null; datei: HandbuchDatei | null; nurDeutsch: boolean } {
  const fr = sprache === 'fr'
  return {
    titel: (fr && e.titel_fr) || e.titel_de,
    beschreibung: (fr && e.beschreibung_fr) || e.beschreibung_de,
    datei: (fr && e.datei_fr) || e.datei_de,
    nurDeutsch: fr && e.art === 'prozess' && !e.datei_fr,
  }
}

/** Suche in Titel und Beschreibung beider Sprachen, ohne Gross/klein. */
export function passt(e: HandbuchEintrag, suche: string): boolean {
  const q = suche.trim().toLowerCase()
  if (!q) return true
  return [e.titel_de, e.titel_fr, e.beschreibung_de, e.beschreibung_fr].join(' ').toLowerCase().includes(q)
}

/** Prozesse alphabetisch in der Sprache der Person, Videos nach Reihenfolge, dann Titel (wie V233). */
export function sortiere(liste: HandbuchEintrag[], sprache: 'de' | 'fr'): HandbuchEintrag[] {
  const titel = (e: HandbuchEintrag) => fassung(e, sprache).titel
  return [...liste].sort(
    (a, b) =>
      (a.art === 'video' ? (a.reihenfolge ?? 99) - (b.reihenfolge ?? 99) : 0) ||
      titel(a).localeCompare(titel(b), sprache),
  )
}

/** Dauer eines Videos: 182 → «3:02». */
export function dauerText(sekunden: number | null): string {
  if (!sekunden) return ''
  const s = Math.round(sekunden)
  return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, '0')}`
}

/** Dateigrösse lesbar: 382592 → «374 KB», 10027872 → «9.6 MB». */
export function groesse(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Nummer einer Meldung wie in V233: 7 → «T007». */
export function meldungNummer(m: Pick<Meldung, 'nummer'>): string {
  return `T${String(m.nummer).padStart(3, '0')}`
}

/** Offen = alles ausser erledigt; «Rückfrage» zählt für die meldende Person als offen. */
export function istOffen(m: Pick<Meldung, 'status'>): boolean {
  return m.status !== 'erledigt'
}
