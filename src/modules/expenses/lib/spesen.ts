import { formatChf, formatDatum } from '@/lib/format'
import type { Spese, SpesenFilter } from '../types'

/** Heutiges Datum in Zürich als ISO-Text (die Spese gehört zum Tag in der Schweiz, nicht in UTC). */
export function heuteZuerich(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date())
}

/** Spesen nach Stand filtern. «offen» heisst eingereicht und noch nicht ausbezahlt. */
export function filtern(liste: Spese[], filter: SpesenFilter): Spese[] {
  if (filter === 'alle') return liste
  if (filter === 'offen') return liste.filter((s) => s.status === 'eingereicht')
  return liste.filter((s) => s.status === filter)
}

/** Offene Summe je Person (für «Alle Spesen» der Buchhaltung), grösste zuerst. */
export function offenJePerson(liste: Spese[]): { person_id: string; person: string; rappen: number; anzahl: number }[] {
  const je = new Map<string, { person_id: string; person: string; rappen: number; anzahl: number }>()
  for (const s of liste) {
    if (s.status !== 'eingereicht') continue
    const alt = je.get(s.person_id) ?? { person_id: s.person_id, person: s.person ?? '–', rappen: 0, anzahl: 0 }
    alt.rappen += s.betrag_rappen
    alt.anzahl += 1
    je.set(s.person_id, alt)
  }
  return [...je.values()].sort((a, b) => b.rappen - a.rappen)
}

/** Summe in Rappen. */
export const summe = (liste: Spese[]) => liste.reduce((a, s) => a + s.betrag_rappen, 0)

const KOPF = {
  de: ['Datum', 'Person', 'Kategorie', 'Zweck', 'Betrag CHF', 'Stand', 'Ausbezahlt am', 'Beleg'],
  fr: ['Date', 'Personne', 'Catégorie', 'Motif', 'Montant CHF', 'État', 'Payé le', 'Justificatif'],
}

/** CSV für die Buchhaltung (Strichpunkt, UTF-8 mit BOM für Excel), Betrag in Franken mit Punkt. */
export function spesenCsv(
  liste: Spese[],
  sprache: 'de' | 'fr',
  text: { kategorie: (k: string) => string; status: (s: string) => string },
): string {
  const feld = (v: string) => (/[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const zeilen = liste.map((s) =>
    [
      formatDatum(s.datum),
      s.person ?? '',
      text.kategorie(s.kategorie),
      s.zweck ?? '',
      (s.betrag_rappen / 100).toFixed(2),
      text.status(s.status),
      s.ausbezahlt_am ? formatDatum(s.ausbezahlt_am) : '',
      s.beleg_name ?? '',
    ]
      .map(feld)
      .join(';'),
  )
  return `\uFEFF${[KOPF[sprache].join(';'), ...zeilen].join('\r\n')}\r\n`
}

/** Text der Mail an die Buchhaltung: eine Zeile je Spese und das Total. */
export function mailZeilen(liste: Spese[], kategorie: (k: string) => string): string {
  const zeilen = liste.map(
    (s) =>
      `- ${formatDatum(s.datum)} · ${kategorie(s.kategorie)} · ${s.zweck ?? ''} · ${formatChf(s.betrag_rappen, { mitWaehrung: true })}`,
  )
  return [...zeilen, '', `Total ${formatChf(summe(liste), { mitWaehrung: true })}`].join('\n')
}
