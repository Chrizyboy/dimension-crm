/** Bereiche, deren Datensätze der Assistent als Link öffnen kann. */
const ZIELE = new Set([
  'kontakte',
  'verkaufschancen',
  'offerten',
  'projekte',
  'service_faelle',
  'rechnungen',
  'wartungsvertraege',
  'aufgaben',
  'posteingang',
  'ausgangskorb',
  'bestellungen',
  'kreditor_zahlungen',
  'grossprojekte',
  'ausschreibungen',
  'anlagen',
  'spesen',
  'fahrzeuge',
  'geraete',
  'marketing_kampagnen',
  'lagerbestand',
  'nachtraege',
])

/** Kann eine Zeile dieser Tabelle direkt geöffnet werden? */
export function hatZiel(tabelle: string): boolean {
  return ZIELE.has(tabelle)
}
