/**
 * Alle Stellen, an denen der Assistent im CRM mitarbeitet. «wo» und «wann» sind feste Texte; Aufrufe und Kosten
 * kommen aus dem Protokoll. Die Planung einer Frage («frage_plan») zählt zur Frage.
 */
export const FUNKTIONEN: { funktion: string; wo: string; wann: 'klick' | 'zeitplan' | 'taeglich' }[] = [
  { funktion: 'frage', wo: 'assistent', wann: 'klick' },
  { funktion: 'dokument', wo: 'assistent', wann: 'klick' },
  { funktion: 'entwurf', wo: 'akten', wann: 'klick' },
  { funktion: 'posteingang', wo: 'inbox', wann: 'zeitplan' },
  { funktion: 'mail_erkennen', wo: 'inbox', wann: 'klick' },
  { funktion: 'zusammenfassung', wo: 'akten', wann: 'klick' },
  { funktion: 'lead_bewertung', wo: 'sales', wann: 'klick' },
  { funktion: 'luftbild', wo: 'sales', wann: 'klick' },
  { funktion: 'briefing', wo: 'today', wann: 'taeglich' },
  { funktion: 'notiz', wo: 'akten', wann: 'klick' },
  { funktion: 'offerte_pdf', wo: 'quotes', wann: 'klick' },
  { funktion: 'beleg', wo: 'expenses', wann: 'klick' },
  { funktion: 'grossprojekt_recherche', wo: 'contracting', wann: 'zeitplan' },
  { funktion: 'automation', wo: 'automations', wann: 'zeitplan' },
  { funktion: 'marketing_text', wo: 'marketing', wann: 'klick' },
  { funktion: 'social', wo: 'marketing', wann: 'klick' },
  { funktion: 'monatsbericht', wo: 'sales', wann: 'klick' },
  { funktion: 'stil_lernen', wo: 'akten', wann: 'klick' },
]
