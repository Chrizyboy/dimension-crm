import { formatDatumZeit } from '@/lib/format'
import type { AusgangEintrag, AusgangGruppe, AusgangOrdner, AusgangStatus } from '../types'

/** Farbe der Statusmarke: offen = Info, raus = ok, Fehler = kritisch. */
export const STATUS_TON: Record<AusgangStatus, 'neutral' | 'info' | 'ok' | 'warnung' | 'kritisch'> = {
  wartet: 'warnung',
  freigegeben: 'info',
  wird_gesendet: 'info',
  gesendet: 'ok',
  fehler: 'kritisch',
  verworfen: 'neutral',
}

/** Datum und Uhrzeit kurz: «21.10.2026 14:05». */
export const zeitpunkt = formatDatumZeit

/** Erste Zeile des Inhalts als Vorschau (Betreff bei Mails und Briefen, Text bei SMS). */
export function vorschau(e: { kanal: string; betreff: string | null; text: string | null }): string {
  const t = e.kanal === 'sms' ? e.text : e.betreff
  return (t ?? '').replace(/\s+/g, ' ').trim()
}

/** Gehört der Eintrag in den Ordner? Eine Stelle für Liste und Zähler. */
export function imOrdner(e: AusgangEintrag, o: AusgangOrdner, jetzt = new Date()): boolean {
  const geplant = e.sende_ab !== null && new Date(e.sende_ab) > jetzt
  switch (o) {
    case 'fuer_mich':
      return e.fuer_mich && e.status === 'wartet'
    case 'fehler':
      return e.status === 'fehler'
    case 'zurueck':
      return e.zurueck_am !== null && e.status === 'wartet'
    case 'team':
      return e.status === 'wartet' || e.status === 'fehler'
    case 'geplant':
      return e.status === 'freigegeben' && geplant
    case 'unterwegs':
      return (e.status === 'freigegeben' && !geplant) || e.status === 'wird_gesendet'
    case 'gesendet':
      return e.status === 'gesendet'
    case 'verworfen':
      return e.status === 'verworfen'
  }
}

/** Statuswerte, die ein Ordner aus der Datenbank braucht (der Rest wird in der App gefiltert). */
export function ordnerStatus(o: AusgangOrdner): AusgangStatus[] {
  if (o === 'gesendet') return ['gesendet']
  if (o === 'verworfen') return ['verworfen']
  return ['wartet', 'fehler', 'freigegeben', 'wird_gesendet']
}

/** Wie viele Arbeitsminuten ungefähr: hier reicht die Uhrzeit (Anzeige «seit 26 Std.»). */
export function wartetStunden(e: Pick<AusgangEintrag, 'erstellt_am' | 'zurueck_am'>, jetzt = new Date()): number {
  const ab = new Date(e.zurueck_am ?? e.erstellt_am).getTime()
  return Math.max(0, Math.floor((jetzt.getTime() - ab) / 3_600_000))
}

/** Ab so vielen gleichen Einträgen (gleiche Kampagne oder automatisch gleiche Art am gleichen Tag) zeigt die Liste eine Serie. */
export const SERIE_AB = 3

function serieSchluessel(e: AusgangEintrag): string | null {
  // Serien-Mails und Newsletter tragen die Kampagne als Bezug; Mahnläufe usw. entstehen automatisch am selben Tag.
  // Von Hand vorbereitete Einzelmails (z. B. Offerten an verschiedene Kunden) sind nie eine Serie: jede braucht
  // ihren eigenen Blick.
  if (e.bezug_tabelle === 'kampagnen' && e.bezug_id) return `${e.art}:${e.bezug_id}`
  if (e.automatisch) return `${e.art}:${e.erstellt_am.slice(0, 10)}`
  return null
}

/**
 * Teilt die Liste in Gruppen: zuerst Serien (ab SERIE_AB gleichen offenen Einträgen), dann nach Alter
 * (heute, gestern, älter). Gesendete und Verworfene nur nach Tag. Reihenfolge innerhalb: neueste zuerst.
 */
export function gruppiere(liste: AusgangEintrag[], jetzt = new Date()): AusgangGruppe[] {
  const serien = new Map<string, AusgangEintrag[]>()
  for (const e of liste) {
    if (e.status !== 'wartet' || e.zurueck_am) continue
    const s = serieSchluessel(e)
    if (!s) continue
    serien.set(s, [...(serien.get(s) ?? []), e])
  }
  const inSerie = new Set<string>()
  const gruppen: AusgangGruppe[] = []
  for (const [s, eintraege] of serien) {
    if (eintraege.length < SERIE_AB) continue
    eintraege.forEach((e) => inSerie.add(e.id))
    gruppen.push({ schluessel: `serie:${s}`, titel: s.split(':')[0] ?? '', serie: true, eintraege })
  }
  const heute = tagBeginn(jetzt)
  const gestern = heute - 86_400_000
  const nachAlter: Record<string, AusgangEintrag[]> = { heute: [], gestern: [], aelter: [] }
  for (const e of liste) {
    if (inSerie.has(e.id)) continue
    const t = new Date(e.gesendet_am ?? e.erstellt_am).getTime()
    const k = t >= heute ? 'heute' : t >= gestern ? 'gestern' : 'aelter'
    nachAlter[k]?.push(e)
  }
  for (const k of ['heute', 'gestern', 'aelter'] as const) {
    const eintraege = nachAlter[k] ?? []
    if (eintraege.length) gruppen.push({ schluessel: k, titel: k, serie: false, eintraege })
  }
  return gruppen
}

function tagBeginn(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Vorschläge für «Später senden»: heute 17:00 (wenn noch nicht vorbei), morgen 08:00, nächster Montag 08:00. */
export function spaeterZeiten(jetzt = new Date()): { schluessel: 'heute17' | 'morgen8' | 'montag8'; zeit: Date }[] {
  const um = (tage: number, stunde: number) => {
    const d = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + tage, stunde, 0, 0, 0)
    return d
  }
  const liste: { schluessel: 'heute17' | 'morgen8' | 'montag8'; zeit: Date }[] = []
  if (jetzt.getHours() < 16) liste.push({ schluessel: 'heute17', zeit: um(0, 17) })
  // Morgen 08:00; fällt «morgen» aufs Wochenende, ist Montag die bessere Wahl (dann nur einmal zeigen).
  const morgen = um(1, 8)
  const tageBisMontag = (8 - jetzt.getDay()) % 7 || 7
  const montag = um(tageBisMontag, 8)
  if (morgen.getDay() !== 0 && morgen.getDay() !== 6) liste.push({ schluessel: 'morgen8', zeit: morgen })
  if (montag.getTime() !== morgen.getTime()) liste.push({ schluessel: 'montag8', zeit: montag })
  return liste
}

/** Feste Gründe für «Nicht senden»; «anderes» öffnet ein Textfeld. */
export const VERWERF_GRUENDE = ['erledigt', 'telefoniert', 'falsch', 'doppelt', 'veraltet', 'anderes'] as const

/** Fehlercodes, die der Mensch selbst lösen kann, und was die Lösung ist. */
export function fehlerLoesung(e: {
  kanal: string
  fehler: string | null
}): 'outlook' | 'sms' | 'unklar' | 'anhang' | 'nochmal' {
  const f = e.fehler ?? ''
  if (f === 'ausgang.unklar') return 'unklar'
  if (/anhang/i.test(f)) return 'anhang'
  if (e.kanal === 'sms') return /intern/.test(f) ? 'nochmal' : 'sms'
  if (/abgelaufen|falsches_konto|anmeldung|nicht_verbunden|neu_verbinden|kein_absender|nicht_eingerichtet/.test(f))
    return 'outlook'
  return 'nochmal'
}

/** HTML einer Mail als reiner Text (nie als HTML anzeigen: fremde Inhalte sind Daten). */
export function alsText(html: string): string {
  const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'), 'text/html')
  return d.body.textContent.trim()
}
