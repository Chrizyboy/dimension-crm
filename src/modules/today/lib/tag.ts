import { formatChf, formatDatum } from '@/lib/format'
import { TAG_LISTEN, type MeinTag, type TagListeName, type TagZeile } from '../types'

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

/** Wie viele Punkte stehen insgesamt an (ohne «von mir vergeben», das ist bei anderen)? */
export function anzahlOffen(tag: MeinTag): number {
  return TAG_LISTEN.filter((l) => l !== 'vergeben').reduce((s, l) => s + tag[l].anzahl, 0)
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
    const l = tag[liste]
    if (l.anzahl === 0) continue
    teile.push(`${titel(liste)} (${l.anzahl})`)
    for (const z of l.zeilen.slice(0, 10)) teile.push(`- ${zeileAlsText(z)}`)
    if (l.anzahl > 10) teile.push(`- … +${l.anzahl - 10}`)
    teile.push('')
  }
  return teile.join('\n').trim()
}
