import { formatChf, formatDatum } from '@/lib/format'
import { TAG_LISTEN, type MeinTag, type TagListe, type TagListeName, type TagZeile } from '../types'

/** Tageszeit für die Begrüssung (V233: «Guten Morgen» bis 11 Uhr, «Guten Tag» bis 17 Uhr, sonst «Guten Abend»). */
export function tageszeit(jetzt: Date = new Date()): 'morgen' | 'tag' | 'abend' {
  const teile = new Intl.DateTimeFormat('de-CH', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Zurich' })
  const stunde = Number(teile.formatToParts(jetzt).find((t) => t.type === 'hour')?.value ?? 12)
  return stunde < 11 ? 'morgen' : stunde < 17 ? 'tag' : 'abend'
}

/** Vorname aus «Vorname Nachname» für die Begrüssung. */
export function vorname(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

/**
 * Eine Liste aus «Mein Tag», leer wenn sie fehlt: Bis die neue Datenbank-Funktion hochgeladen ist, liefert die
 * Cloud z. B. noch keine Freigaben.
 */
export function listeVon(tag: MeinTag, liste: TagListeName): TagListe {
  const listen: Partial<Record<TagListeName, TagListe>> = tag
  return listen[liste] ?? { anzahl: 0, zeilen: [] }
}

/** Wie viele Punkte stehen insgesamt an (ohne «von mir vergeben», das ist bei anderen)? */
export function anzahlOffen(tag: MeinTag): number {
  return TAG_LISTEN.filter((l) => l !== 'vergeben').reduce((s, l) => s + listeVon(tag, l).anzahl, 0)
}

/** Eine Zeile als Text: Datum/Zeit, Titel, Zusatz, Betrag. */
export function zeileAlsText(z: TagZeile): string {
  const wann = [z.datum ? formatDatum(z.datum) : '', z.zeit ?? ''].filter(Boolean).join(' ')
  const betrag = z.betrag_rappen != null ? formatChf(z.betrag_rappen, { mitWaehrung: true }) : ''
  return [wann, z.titel, z.unter ?? '', betrag].filter(Boolean).join(' · ')
}

/**
 * Text der Mail «Übersicht per Mail an mich» (V233 heuteMailText): pro Liste die Überschrift mit Anzahl und bis
 * zu 10 Zeilen. Leere Listen fehlen. `titel` liefert die Überschrift in der Sprache der Person.
 */
export function tagesMailText(tag: MeinTag, titel: (liste: TagListeName) => string, kopf: string): string {
  const teile = [kopf, '']
  for (const liste of TAG_LISTEN) {
    const l = listeVon(tag, liste)
    if (l.anzahl === 0) continue
    teile.push(`${titel(liste)} (${l.anzahl})`)
    for (const z of l.zeilen.slice(0, 10)) teile.push(`- ${zeileAlsText(z)}`)
    if (l.anzahl > 10) teile.push(`- … +${l.anzahl - 10}`)
    teile.push('')
  }
  return teile.join('\n').trim()
}

/** Zeilen, die man verschieben kann: alles ausser Terminen (Kalender) und Einträgen ohne Datensatz. */
export function verschiebbar(z: TagZeile): boolean {
  if (['besichtigung', 'service', 'einsatz', 'kalender', 'freigabe'].includes(z.art)) return false
  return Boolean(z.art === 'aufgabe' ? z.aufgabe_id : z.id)
}

/** Datum als «JJJJ-MM-TT» `tage` nach `heute` (ohne Zeitzonen-Sprünge, weil mittags gerechnet). */
export function plusTage(heute: string, tage: number): string {
  const d = new Date(`${heute}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/** Montag der nächsten Woche (von Sonntag aus: morgen). */
export function naechsterMontag(heute: string): string {
  const wochentag = new Date(`${heute}T12:00:00Z`).getUTCDay() // 0 = Sonntag
  return plusTage(heute, wochentag === 0 ? 1 : 8 - wochentag)
}

/**
 * Warum steht die Zeile hier? i18n-Schlüssel unter `tag.warum` mit Werten, oder null. Kurz und konkret:
 * «seit 14 Tagen ohne Antwort», «Anfrage seit 2 Tagen», «von Andy».
 */
export function warum(z: TagZeile): { schluessel: string; werte: Record<string, unknown> } | null {
  if (z.art === 'nachfassen' && z.tage != null) return { schluessel: 'tag.warum.nachfassen', werte: { count: z.tage } }
  if (z.art === 'lead' && z.tage != null) return { schluessel: 'tag.warum.lead', werte: { count: z.tage } }
  if (z.art === 'aufgabe' && z.von) return { schluessel: 'tag.warum.von', werte: { name: vorname(z.von) } }
  if (z.art === 'freigabe' && z.kanal) return { schluessel: `tag.warum.kanal_${z.kanal}`, werte: {} }
  return null
}

/** Fortschritt eines Ziels in Prozent (0–100), für den Balken. */
export function zielProzent(ist: number, ziel: number): number {
  if (ziel <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((ist / ziel) * 100)))
}
