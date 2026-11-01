import type { Position, Rechnung } from '../types'

/**
 * Summen einer Rechnung, genau wie die Datenbank (intern.rechnung_rechnen) sie rechnet: Zeilen auf Rappen
 * gerundet; inkl. MWST wird die MWST herausgerechnet, exkl. MWST draufgeschlagen. So stimmt die Vorschau
 * im Entwurf mit dem gespeicherten Betrag überein.
 */
export function summen(
  positionen: Pick<Position, 'menge' | 'preis_rappen'>[],
  inklMwst: boolean,
  satz: number,
): { netto: number; mwst: number; total: number } {
  const summe = positionen.reduce((s, p) => s + Math.round((p.menge || 0) * (p.preis_rappen || 0)), 0)
  if (inklMwst) {
    const netto = Math.round(summe / (1 + satz / 100))
    return { netto, mwst: summe - netto, total: summe }
  }
  const mwst = Math.round((summe * satz) / 100)
  return { netto: summe, mwst, total: summe + mwst }
}

export { zeilenBetrag } from '@/lib/rechnung'

/** Darf gemahnt werden? (gestellt oder teilbezahlt, fällig vorbei, noch nicht Stufe 3) */
export function mahnbar(r: Pick<Rechnung, 'status' | 'faellig_am' | 'mahnstufe'>, heute: string): boolean {
  return (
    (r.status === 'gestellt' || r.status === 'teilbezahlt') && !!r.faellig_am && r.faellig_am < heute && r.mahnstufe < 3
  )
}

/** Heutiges Datum in Zürich als JJJJ-MM-TT. */
export function heuteZuerich(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(jetzt)
}

/** Datum plus Tage (JJJJ-MM-TT). */
export function plusTage(iso: string, tage: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

/** Ein Feld für CSV: Strichpunkt, Anführungszeichen und Zeilenumbruch werden geschützt. */
function feld(wert: string): string {
  return /[;"\n\r]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert
}

const datumCh = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : '')
const chf = (rappen: number) => (rappen / 100).toFixed(2)

const KOPF = {
  de: [
    'Nummer',
    'Datum',
    'Fällig',
    'Kunde',
    'Kundennr.',
    'Projekt',
    'Art',
    'Stand',
    'Total CHF',
    'Bezahlt CHF',
    'Offen CHF',
    'Mahnstufe',
    'Firma',
    'AbaNinja',
  ],
  fr: [
    'Numéro',
    'Date',
    'Échéance',
    'Client',
    'N° client',
    'Projet',
    'Type',
    'État',
    'Total CHF',
    'Payé CHF',
    'Ouvert CHF',
    'Rappel',
    'Société',
    'AbaNinja',
  ],
}

/**
 * «Liste exportieren» (V233): die gefilterte Liste als CSV (Strichpunkt, UTF-8 mit BOM für Excel).
 * Art und Stand kommen als Text in der gewählten Sprache.
 */
export function rechnungenCsv(
  liste: Rechnung[],
  sprache: 'de' | 'fr',
  text: { art: (a: string) => string; status: (s: string) => string },
): string {
  const zeilen = liste.map((r) =>
    [
      r.nummer ?? '',
      datumCh(r.datum),
      datumCh(r.faellig_am),
      r.kunde,
      r.kundennummer ? String(r.kundennummer) : '',
      r.projekt_nummer ?? '',
      text.art(r.art),
      text.status(r.status),
      chf(r.total_rappen),
      chf(r.bezahlt_rappen),
      chf(r.offen_rappen),
      String(r.mahnstufe),
      r.firma,
      r.abaninja_status ?? '',
    ]
      .map(feld)
      .join(';'),
  )
  return `\ufeff${[KOPF[sprache].join(';'), ...zeilen].join('\r\n')}\r\n`
}

export { pdfZeigen } from '@/lib/datei'
