import type { Zeit } from '../types'
import { minuten, stundenText, zuerich } from './zeit'

const KOPF = {
  de: ['Kürzel', 'Name', 'Datum', 'Start', 'Stopp', 'Pause (Min.)', 'Stunden', 'Art', 'Projekt', 'Rapport', 'Notiz'],
  fr: ['Code', 'Nom', 'Date', 'Début', 'Fin', 'Pause (min)', 'Heures', 'Type', 'Projet', 'Rapport', 'Remarque'],
}
const ART = { de: { arbeit: 'Arbeit', reise: 'Reise' }, fr: { arbeit: 'Travail', reise: 'Déplacement' } }

/** Ein Feld für CSV: Strichpunkt, Anführungszeichen und Zeilenumbruch werden geschützt. */
function feld(wert: string): string {
  return /[;"\n\r]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert
}

/** Datum TT.MM.JJJJ aus JJJJ-MM-TT. */
function datumCh(iso: string): string {
  const [j = '', m = '', t = ''] = iso.split('-')
  return `${t}.${m}.${j}`
}

/**
 * Lohn-Export als CSV (Strichpunkt, UTF-8 mit BOM, damit Excel Umlaute richtig zeigt): eine Zeile je Zeit,
 * sortiert nach Person und Beginn. Das genaue Import-Format von AbaNinja wird mit dem ersten echten Export
 * abgeglichen (Entscheid 0020); die Spalten sind deshalb bewusst einfach.
 */
export function lohnCsv(zeiten: Zeit[], sprache: 'de' | 'fr' = 'de'): string {
  const zeilen = [...zeiten]
    .filter((z) => z.stopp)
    .sort((a, b) => (a.person ?? '').localeCompare(b.person ?? '') || a.start.localeCompare(b.start))
    .map((z) => {
      const s = zuerich(z.start)
      const e = zuerich(z.stopp ?? z.start)
      return [
        z.person_kuerzel ?? '',
        z.person ?? '',
        datumCh(s.datum),
        s.zeit,
        e.zeit,
        String(z.pause_min),
        stundenText(minuten(z)),
        ART[sprache][z.art],
        z.projekt_nummer ?? '',
        z.rapport_nummer ?? '',
        z.notiz ?? '',
      ]
        .map(feld)
        .join(';')
    })
  return `\uFEFF${[KOPF[sprache].join(';'), ...zeilen].join('\r\n')}\r\n`
}
