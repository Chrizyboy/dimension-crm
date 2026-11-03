import type { Kundenakte, Nachverkauf } from '../types'

/** Die Zahlen oben in der Kundenakte. Beträge in Rappen. */
export interface AkteZahlen {
  kundeSeit: string
  auftraegeRappen: number
  offenRappen: number
  ueberfaellig: number
  kwp: number
  serviceOffen: number
  naechsterTermin: { datum: string; art: 'besichtigung' | 'service' | 'wartung' | 'baubeginn' } | null
}

/** Rechnungen, die noch Geld erwarten (Entwurf und Storno zählen nicht). */
const OFFEN = new Set(['gestellt', 'teilbezahlt'])

/**
 * Seit wann wir die Person kennen: das früheste Datum aus Kontakt, Anfrage und Offerte.
 * Beim Import aus V233 bekam der Kontakt das Importdatum; die Anfrage hat das echte.
 */
export function erstesDatum(akte: Kundenakte): string {
  const daten = [
    akte.kontakt.erstellt_am,
    ...akte.verkaufschancen.map((v) => v.eingang_am ?? v.erstellt_am),
    ...akte.offerten.map((o) => o.angebot_am ?? o.erstellt_am),
  ].filter((d): d is string => Boolean(d))
  return daten.sort().at(0) ?? ''
}

/**
 * Rechnet die Kopfzahlen der Akte aus den geladenen Zeilen, damit Zahl und Liste darunter immer übereinstimmen.
 * Auftragswert = Vertragswerte der Projekte (inkl. MWST), sonst unterschriebene Werkverträge ohne Projekt.
 * `heute` als ISO-Datum (YYYY-MM-DD), damit der Test nicht vom Tag abhängt.
 */
export function akteZahlen(akte: Kundenakte, nach: Nachverkauf, heute: string): AkteZahlen {
  const mitProjekt = new Set(akte.projekte.map((p) => p.id))
  const projekte = akte.projekte.reduce((s, p) => s + (p.vertragswert_rappen ?? 0), 0)
  const vertraege = akte.werkvertraege
    .filter((w) => w.unterschrieben_am && !(w.projekt_id && mitProjekt.has(w.projekt_id)))
    .reduce((s, w) => s + (w.betrag_rappen ?? 0), 0)
  const offen = nach.rechnungen.filter((r) => r.status && OFFEN.has(r.status))
  const termine: NonNullable<AkteZahlen['naechsterTermin']>[] = [
    ...akte.verkaufschancen.map((v) => ({ datum: v.termin_am, art: 'besichtigung' as const })),
    ...nach.serviceFaelle
      .filter((f) => f.status !== 'erledigt')
      .map((f) => ({ datum: f.termin_am, art: 'service' as const })),
    ...nach.wartungsvertraege
      .filter((w) => w.status === 'aktiv')
      .map((w) => ({ datum: w.naechste_wartung, art: 'wartung' as const })),
    ...akte.projekte.map((p) => ({ datum: p.baubeginn, art: 'baubeginn' as const })),
  ].filter((t): t is { datum: string; art: typeof t.art } => Boolean(t.datum && t.datum.slice(0, 10) >= heute))
  termine.sort((a, b) => a.datum.localeCompare(b.datum))
  return {
    kundeSeit: erstesDatum(akte),
    auftraegeRappen: projekte + vertraege,
    offenRappen: offen.reduce((s, r) => s + (r.offen_rappen ?? r.total_rappen ?? 0), 0),
    ueberfaellig: offen.filter((r) => r.ueberfaellig).length,
    kwp: Math.round(nach.anlagen.reduce((s, a) => s + (a.leistung_kwp ?? 0), 0) * 10) / 10,
    serviceOffen: nach.serviceFaelle.filter((f) => f.status !== 'erledigt').length,
    naechsterTermin: termine.at(0) ?? null,
  }
}
