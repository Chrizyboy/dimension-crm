import type { EigeneRate, KonditionTranche, Tranche } from '../types'

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
 * sonst «kondition_pv» (40/30/30).
 */
export function vorschlagKondition(
  o: { kwp: number | null; anzahlModule: number | null; batterie: string | null },
  standard: { pv: string; batterie: string } = { pv: '40_30_30', batterie: '70_30' },
): string {
  const pv = (o.kwp ?? 0) > 0 || (o.anzahlModule ?? 0) > 0
  return o.batterie && !pv ? standard.batterie : standard.pv
}

/**
 * Eigene Raten als Tranchen, genau wie die Datenbank (intern.eigene_tranchen): Bezeichnung in beiden Sprachen
 * gleich, die erste Rate ist die Anzahlung (10 Tage nach Unterzeichnung fällig).
 */
export function eigeneTranchen(raten: readonly EigeneRate[]): KonditionTranche[] {
  return raten.map((r, i) => ({
    anteil: r.prozent / 100,
    de: r.text.trim(),
    fr: r.text.trim(),
    ...(i === 0 ? { faellig: 'unterschrift' as const, tage: 10 } : {}),
  }))
}

/** Summe der eigenen Raten in Prozent (auf Hundertstel, gegen Rundungsreste beim Addieren). */
export const ratenSumme = (raten: readonly EigeneRate[]) =>
  Math.round(raten.reduce((s, r) => s + (Number.isFinite(r.prozent) ? r.prozent : 0), 0) * 100) / 100

/** Gültig wie in der Datenbank: 1 bis 6 Raten, jede mit Text und mehr als 0 %, zusammen genau 100 %. */
export const ratenGueltig = (raten: readonly EigeneRate[]) =>
  raten.length > 0 &&
  raten.length <= 6 &&
  raten.every((r) => r.text.trim() !== '' && r.prozent > 0) &&
  ratenSumme(raten) === 100

/** Startwerte für «Eigene Raten»: die gerade gewählte Vorlage (Texte in der Vertragssprache), sonst 50 / 50. */
export function ratenStart(tranchen: readonly KonditionTranche[], sprache: 'de' | 'fr'): EigeneRate[] {
  if (tranchen.length > 0 && tranchen.every((t) => !t.betrag && t.anteil)) {
    return tranchen.map((t) => ({
      text: sprache === 'fr' ? t.fr : t.de,
      prozent: Math.round((t.anteil ?? 0) * 10000) / 100,
    }))
  }
  return sprache === 'fr'
    ? [
        { text: '50 % à la signature du contrat', prozent: 50 },
        { text: '50 % après la mise en service', prozent: 50 },
      ]
    : [
        { text: '50 % bei Vertragsunterzeichnung', prozent: 50 },
        { text: '50 % nach Inbetriebnahme', prozent: 50 },
      ]
}
