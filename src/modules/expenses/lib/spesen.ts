import { formatChf, formatDatum } from '@/lib/format'
import type { Spese, SpesenFilter, SpesenStatus } from '../types'

/** Heutiges Datum in Zürich als ISO-Text (die Spese gehört zum Tag in der Schweiz, nicht in UTC). */
export function heuteZuerich(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date())
}

/** Stände, in denen eine Spese noch unterwegs ist (weder ausbezahlt noch erledigt). */
const UNTERWEGS: SpesenStatus[] = ['eingereicht', 'rueckfrage', 'geprueft']

/** Die Person darf ihre Spese noch ändern oder zurückziehen (vor der Prüfung oder bei einer Rückfrage). */
export const aenderbar = (s: Spese) => s.status === 'eingereicht' || s.status === 'rueckfrage'

/**
 * Spesen nach Stand filtern. «offen» = eigenes Geld und noch unterwegs; «firmenkarte» = alle Firmenkarten-Belege
 * (die werden nie ausbezahlt); «abgelehnt» umfasst auch zurückgezogene.
 */
export function filtern(liste: Spese[], filter: SpesenFilter): Spese[] {
  switch (filter) {
    case 'alle':
      return liste
    case 'offen':
      return liste.filter((s) => s.bezahlt_mit === 'eigen' && UNTERWEGS.includes(s.status))
    case 'firmenkarte':
      return liste.filter((s) => s.bezahlt_mit === 'firmenkarte' && s.status !== 'storniert')
    case 'abgelehnt':
      return liste.filter((s) => s.status === 'abgelehnt' || s.status === 'storniert')
    case 'ausbezahlt':
      return liste.filter((s) => s.status === 'ausbezahlt')
  }
}

/** Summe in Rappen. */
export const summe = (liste: Spese[]) => liste.reduce((a, s) => a + s.betrag_rappen, 0)

/** Kopfzahlen für «Meine Spesen»: was ausbezahlt wird, was bei der Buchhaltung liegt, Rückfragen, Jahr. */
export function meineZahlen(liste: Spese[], jahr: string) {
  const eigen = liste.filter((s) => s.bezahlt_mit === 'eigen')
  const geprueft = eigen.filter((s) => s.status === 'geprueft')
  const eingereicht = eigen.filter((s) => s.status === 'eingereicht')
  const ausbezahlt = eigen.filter((s) => s.status === 'ausbezahlt' && (s.ausbezahlt_am ?? '').startsWith(jahr))
  const letzte = eigen
    .filter((s) => s.status === 'ausbezahlt' && s.ausbezahlt_am)
    .sort((a, b) => (b.ausbezahlt_am ?? '').localeCompare(a.ausbezahlt_am ?? ''))[0]
  return {
    geprueft: { rappen: summe(geprueft), anzahl: geprueft.length },
    eingereicht: { rappen: summe(eingereicht), anzahl: eingereicht.length },
    rueckfragen: liste.filter((s) => s.status === 'rueckfrage'),
    jahr: { rappen: summe(ausbezahlt), anzahl: ausbezahlt.length },
    letzte: letzte ? { am: letzte.ausbezahlt_am ?? '', mit: letzte.ausbezahlt_mit } : null,
  }
}

/** Je Person zusammenfassen (Auszahlen, Auswertung), grösste Summe zuerst. */
export function jePerson(
  liste: Spese[],
): { person_id: string; person: string; rappen: number; anzahl: number; km: number; spesen: Spese[] }[] {
  const je = new Map<
    string,
    { person_id: string; person: string; rappen: number; anzahl: number; km: number; spesen: Spese[] }
  >()
  for (const s of liste) {
    const alt = je.get(s.person_id) ?? {
      person_id: s.person_id,
      person: s.person ?? '–',
      rappen: 0,
      anzahl: 0,
      km: 0,
      spesen: [],
    }
    alt.rappen += s.betrag_rappen
    alt.anzahl += 1
    alt.km += s.km ?? 0
    alt.spesen.push(s)
    je.set(s.person_id, alt)
  }
  return [...je.values()].sort((a, b) => b.rappen - a.rappen)
}

/** Auszahlbar: geprüft (oder noch eingereicht ohne Hinweis) und mit eigenem Geld bezahlt. */
export const auszahlbar = (s: Spese) => s.bezahlt_mit === 'eigen' && s.status === 'geprueft'

/** Summen nach einem Schlüssel (Kategorie, Projekt, Monat) für die Auswertung, grösste zuerst. */
export function gruppieren(
  liste: Spese[],
  schluessel: (s: Spese) => string | null,
): { schluessel: string; rappen: number; anzahl: number }[] {
  const je = new Map<string, { schluessel: string; rappen: number; anzahl: number }>()
  for (const s of liste) {
    const k = schluessel(s)
    if (k === null) continue
    const alt = je.get(k) ?? { schluessel: k, rappen: 0, anzahl: 0 }
    alt.rappen += s.betrag_rappen
    alt.anzahl += 1
    je.set(k, alt)
  }
  return [...je.values()].sort((a, b) => b.rappen - a.rappen)
}

/** Kilometer-Betrag wie in der Datenbank: km × Ansatz, auf Rappen gerundet. */
export const kmBetrag = (km: number, satzRappen: number) => Math.round(km * satzRappen)

/** MWST im Betrag inkl. (Betrag × Satz / (100 + Satz)), auf Rappen gerundet, wie in der Datenbank. */
export const mwstAusBetrag = (rappen: number, satz: number) => Math.round((rappen * satz) / (100 + satz))

const KOPF = {
  de: [
    'Datum',
    'Person',
    'Kategorie',
    'Konto',
    'Zweck',
    'Projekt',
    'Betrag CHF',
    'MWST %',
    'MWST CHF',
    'Bezahlt mit',
    'Stand',
    'Ausbezahlt am',
    'Beleg',
  ],
  fr: [
    'Date',
    'Personne',
    'Catégorie',
    'Compte',
    'Motif',
    'Projet',
    'Montant CHF',
    'TVA %',
    'TVA CHF',
    'Payé avec',
    'État',
    'Versé le',
    'Justificatif',
  ],
}

/**
 * CSV für die Buchhaltung und AbaNinja (Strichpunkt, UTF-8 mit BOM für Excel), Beträge in Franken mit Punkt,
 * mit Konto und MWST je Spese.
 */
export function spesenCsv(
  liste: Spese[],
  sprache: 'de' | 'fr',
  text: { kategorie: (k: string) => string; status: (s: string) => string; bezahlt: (b: string) => string },
): string {
  const feld = (v: string) => (/[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const zeilen = liste.map((s) =>
    [
      formatDatum(s.datum),
      s.person ?? '',
      text.kategorie(s.kategorie),
      s.konto ?? '',
      s.zweck ?? '',
      s.projekt_nummer ?? '',
      (s.betrag_rappen / 100).toFixed(2),
      s.mwst_satz === null ? '' : String(s.mwst_satz),
      s.mwst_rappen === null ? '' : (s.mwst_rappen / 100).toFixed(2),
      text.bezahlt(s.bezahlt_mit),
      text.status(s.status),
      s.ausbezahlt_am ? formatDatum(s.ausbezahlt_am) : '',
      s.beleg_name ?? '',
    ]
      .map(feld)
      .join(';'),
  )
  return `﻿${[KOPF[sprache].join(';'), ...zeilen].join('\r\n')}\r\n`
}

/** Text der Mail an die Buchhaltung: eine Zeile je Spese und das Total. */
export function mailZeilen(liste: Spese[], kategorie: (k: string) => string): string {
  const zeilen = liste.map(
    (s) =>
      `- ${formatDatum(s.datum)} · ${kategorie(s.kategorie)} · ${s.zweck ?? ''} · ${formatChf(s.betrag_rappen, { mitWaehrung: true })}`,
  )
  return [...zeilen, '', `Total ${formatChf(summe(liste), { mitWaehrung: true })}`].join('\n')
}
