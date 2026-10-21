import { rundeAuf5Rappen } from '@/lib/format'
import type { KonditionTranche, Tranche } from '../types'

function plusTage(iso: string, tage: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/**
 * Zahlungsplan aus Vertragswert und Kondition (V232), genau wie die Datenbank (zahlungsplan_berechnen):
 * jede Tranche auf 5 Rappen gerundet, die letzte nimmt den Rest. Anzahlung fällig x Tage nach
 * Unterzeichnung, «vor Beginn der Arbeiten» am Baubeginn, Schlusszahlung ohne Datum.
 */
export function berechneZahlungsplan(
  wertRappen: number,
  tranchen: readonly KonditionTranche[],
  sprache: 'de' | 'fr',
  unterzeichnet: string,
  baubeginn: string | null = null,
): Tranche[] {
  let benutzt = 0
  return tranchen.map((t, i) => {
    const betrag = i === tranchen.length - 1 ? wertRappen - benutzt : rundeAuf5Rappen(wertRappen * t.anteil)
    benutzt += betrag
    return {
      bezeichnung: sprache === 'fr' ? t.fr : t.de,
      betragRappen: betrag,
      faelligAm:
        t.faellig === 'unterschrift'
          ? plusTage(unterzeichnet, t.tage ?? 0)
          : t.faellig === 'baubeginn'
            ? baubeginn
            : null,
    }
  })
}

/**
 * Vorschlag für die Kondition (V232 auDefaultPlan): Batterie ohne Solaranlage → «batterie» (80/20),
 * sonst «normal» (50/30/20).
 */
export function vorschlagKondition(o: {
  kwp: number | null
  anzahlModule: number | null
  batterie: string | null
}): string {
  const pv = (o.kwp ?? 0) > 0 || (o.anzahlModule ?? 0) > 0
  return o.batterie && !pv ? 'batterie' : 'normal'
}
