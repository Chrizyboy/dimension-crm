/** Wochenplan je Person: Typen aus `wochenplan()` und die Konflikt-Regeln (Modul-Prüfung 23A). */

export type PlanTyp = 'montage' | 'service' | 'wartung'

export interface PlanEintrag {
  typ: PlanTyp
  id: string
  /** Bei Montage die Einsatz-Art (intern, extern, geplant), sonst die Service-Kategorie. */
  art: string | null
  von: string
  bis: string
  zeit: string | null
  personen: string[]
  subunternehmer_id: string | null
  projekt_id: string | null
  nummer: string | null
  titel: string | null
  ort: string | null
}

export interface Wochenplan {
  personen: { id: string; name: string; kuerzel: string | null; rolle: string | null }[]
  subunternehmer: { id: string; name: string }[]
  eintraege: PlanEintrag[]
  abwesenheiten: { person_id: string; art: string; von: string; bis: string; halbtag: boolean }[]
  kurse: { person_id: string; art: string; gueltig_bis: string }[]
}

export type Konflikt = 'abwesend' | 'doppelt' | 'kurs'

/** Datum als JJJJ-MM-TT in Ortszeit. */
export function isoTag(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Montag der Woche, in der das Datum liegt. */
export function wochenAnfang(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m
}

/** Die Tage ab einem Montag (Standard Montag bis Samstag). */
export function wochenTage(montag: Date, anzahl = 6): string[] {
  return Array.from({ length: anzahl }, (_, i) => {
    const d = new Date(montag)
    d.setDate(d.getDate() + i)
    return isoTag(d)
  })
}

/** Abstand in Tagen zwischen zwei JJJJ-MM-TT (für das Verschieben per Ziehen). */
export function tageZwischen(von: string, bis: string): number {
  return Math.round((Date.parse(`${bis}T12:00:00Z`) - Date.parse(`${von}T12:00:00Z`)) / 86_400_000)
}

/** Einträge einer Zeile (Person oder Subunternehmer) an einem Tag. «Geplant» (voraussichtlich) zählt mit. */
export function eintraegeAm(plan: Wochenplan, zeile: { person?: string; sub?: string }, tag: string): PlanEintrag[] {
  return plan.eintraege.filter(
    (e) =>
      e.von <= tag &&
      e.bis >= tag &&
      (zeile.person ? e.personen.includes(zeile.person) : e.subunternehmer_id === zeile.sub),
  )
}

/** Abwesenheit einer Person an einem Tag (die erste, falls mehrere). */
export function abwesendAm(plan: Wochenplan, person: string, tag: string) {
  return plan.abwesenheiten.find((a) => a.person_id === person && a.von <= tag && a.bis >= tag) ?? null
}

/**
 * Konflikte einer Person an einem Tag: eingeplant trotz Abwesenheit, an zwei verschiedenen Orten zugleich
 * (zwei Montagen oder Montage und Service an verschiedenen Projekten; mehrere Service-Termine sind normal) oder ein
 * abgelaufener Kurs/Ausweis bei einem Einsatz. Nur verbindliche Einsätze zählen, «geplant» ist noch offen.
 */
export function konflikteAm(plan: Wochenplan, person: string, tag: string): Konflikt[] {
  const fest = eintraegeAm(plan, { person }, tag).filter((e) => !(e.typ === 'montage' && e.art === 'geplant'))
  if (fest.length === 0) return []
  const k: Konflikt[] = []
  if (abwesendAm(plan, person, tag)) k.push('abwesend')
  const montagen = fest.filter((e) => e.typ === 'montage')
  const projekte = new Set(montagen.map((e) => e.projekt_id))
  const fremderService = fest.some((e) => e.typ !== 'montage' && montagen.length > 0 && !projekte.has(e.projekt_id))
  if (projekte.size > 1 || fremderService) k.push('doppelt')
  if (plan.kurse.some((q) => q.person_id === person && q.gueltig_bis < tag)) k.push('kurs')
  return k
}

/** Anzahl Personen-Tage mit Konflikt im Plan (für die Leiste oben). */
export function konflikteGesamt(plan: Wochenplan, tage: readonly string[]): number {
  return plan.personen.reduce((n, p) => n + tage.filter((t) => konflikteAm(plan, p.id, t).length > 0).length, 0)
}

/** Auslastung: Anteil der Personen-Tage (ohne Abwesenheit) mit mindestens einem Eintrag, 0–100. */
export function auslastung(plan: Wochenplan, tage: readonly string[]): number {
  let frei = 0
  let belegt = 0
  for (const p of plan.personen)
    for (const t of tage) {
      if (abwesendAm(plan, p.id, t)) continue
      frei++
      if (eintraegeAm(plan, { person: p.id }, t).length > 0) belegt++
    }
  return frei ? Math.round((belegt / frei) * 100) : 0
}
