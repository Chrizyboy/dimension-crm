import type { KonditionTranche, Tranche } from '../types'

function plusTage(iso: string, tage: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/** Auf ganze Franken (Werkverträge, Chris 27.10.2026). */
export const rundeFranken = (rappen: number) => Math.round(rappen / 100) * 100

/**
 * Zahlungsplan aus Vertragswert und Kondition, genau wie die Datenbank (zahlungsplan_vorschlag): jede Rate auf
 * ganze Franken, die letzte nimmt den Rest. Bei der eigenen Anzahlung ist die erste Rate der feste Betrag;
 * reicht er bis zum Vertragswert, gibt es nur eine Rate. Anzahlung fällig x Tage nach Unterzeichnung,
 * «vor Beginn der Arbeiten» am Baubeginn, Schlusszahlung ohne Datum.
 */
export function berechneZahlungsplan(
  wertRappen: number,
  tranchen: readonly KonditionTranche[],
  sprache: 'de' | 'fr',
  unterzeichnet: string,
  baubeginn: string | null = null,
  anzahlungRappen: number | null = null,
): Tranche[] {
  let liste = tranchen
  const erste = tranchen[0]
  if (erste?.betrag) {
    if (!anzahlungRappen || anzahlungRappen <= 0) return []
    if (anzahlungRappen >= wertRappen) liste = [{ ...erste, betrag: false, anteil: 1 }]
  }
  let benutzt = 0
  return liste.map((t, i) => {
    const betrag =
      i === liste.length - 1
        ? wertRappen - benutzt
        : t.betrag
          ? (anzahlungRappen ?? 0)
          : rundeFranken(wertRappen * (t.anteil ?? 0))
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
 * Vorschlag für die Kondition: Batterie ohne Solaranlage → Einstellung «kondition_batterie» (70/30),
 * sonst «kondition_pv» (50/30/20 wie V233).
 */
export function vorschlagKondition(
  o: { kwp: number | null; anzahlModule: number | null; batterie: string | null },
  standard: { pv: string; batterie: string } = { pv: 'normal', batterie: '70_30' },
): string {
  const pv = (o.kwp ?? 0) > 0 || (o.anzahlModule ?? 0) > 0
  return o.batterie && !pv ? standard.batterie : standard.pv
}
