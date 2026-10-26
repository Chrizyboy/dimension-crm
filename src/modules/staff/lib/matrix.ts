import type { Auswahlwert } from '@/types/kontakt'
import type { AusweisArt, Qualifikation, ZellenStand } from '../types'

/** Heutiges Datum in Zürich als JJJJ-MM-TT. */
export function heuteZuerich(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/** Ausweis-Arten aus der Auswahlliste lesen (Gültigkeit und Pflicht je Rolle sind Daten, nie Code). */
export function ausweisArten(werte: Auswahlwert[]): AusweisArt[] {
  return werte.map((w) => {
    const e = w.eigenschaften as { gueltig_monate?: number; pflicht_fuer?: string[] }
    return { schluessel: w.schluessel, gueltig_monate: e.gueltig_monate ?? null, pflicht_fuer: e.pflicht_fuer ?? [] }
  })
}

/**
 * Der gültige Eintrag je Person und Art: unbefristet vor befristet, sonst das späteste «gültig bis», bei
 * Gleichstand das späteste «erworben am» (wie die Datenbank-Sicht `fristen`).
 */
export function neueste(liste: Qualifikation[]): Map<string, Qualifikation> {
  const karte = new Map<string, Qualifikation>()
  const rang = (q: Qualifikation) => `${q.gueltig_bis ?? '9999-99-99'}|${q.erworben_am ?? ''}`
  for (const q of liste) {
    const k = `${q.person_id}:${q.art}`
    const bisher = karte.get(k)
    if (!bisher || rang(q) > rang(bisher)) karte.set(k, q)
  }
  return karte
}

/** Stand einer Zelle: vorhanden (gültig, bald ablaufend, abgelaufen), fehlt (Pflicht) oder leer. */
export function zellenStand(q: Qualifikation | undefined, pflicht: boolean, heute: string, vorlauf = 60): ZellenStand {
  if (!q) return pflicht ? 'fehlt' : 'leer'
  if (!q.gueltig_bis) return 'gueltig'
  if (q.gueltig_bis < heute) return 'abgelaufen'
  const tage = (Date.parse(`${q.gueltig_bis}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / 86_400_000
  return tage <= vorlauf ? 'bald' : 'gueltig'
}

/** Ist die Art für diese Rolle Pflicht? */
export const istPflicht = (art: AusweisArt, rolle: string) => art.pflicht_fuer.includes(rolle)

/** Vorschlag für «gültig bis» aus «erworben am» und der Gültigkeit der Art (Monate), sonst leer. */
export function gueltigBisVorschlag(erworben: string, monate: number | null): string {
  if (!erworben || !monate) return ''
  const [j, m, t] = erworben.split('-').map(Number) as [number, number, number]
  const ziel = new Date(Date.UTC(j, m - 1 + monate, 1))
  // Monatsende beachten: 31.01. + 1 Monat = 28./29.02., nicht 03.03.
  const letzter = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate()
  ziel.setUTCDate(Math.min(t, letzter))
  return ziel.toISOString().slice(0, 10)
}

/** Wie viele Probleme hat eine Person (fehlende Pflicht oder abgelaufen)? Für den Filter «Handlungsbedarf». */
export function probleme(
  personId: string,
  rolle: string,
  arten: AusweisArt[],
  gueltig: Map<string, Qualifikation>,
  heute: string,
): number {
  return arten.filter((a) => {
    const s = zellenStand(gueltig.get(`${personId}:${a.schluessel}`), istPflicht(a, rolle), heute)
    return s === 'fehlt' || s === 'abgelaufen'
  }).length
}
