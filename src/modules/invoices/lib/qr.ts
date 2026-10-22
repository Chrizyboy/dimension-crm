/**
 * Swiss QR-Code (Zahlteil der QR-Rechnung, Implementation Guidelines 2.3, «SPC 0200»). Nur der Rückfall,
 * wenn die Rechnung nicht aus AbaNinja kommt (Entscheid 0009): normale IBAN ohne Referenz («NON»), die
 * Rechnungsnummer als Mitteilung. Adressen strukturiert («S»), wie seit November 2025 verlangt.
 */

/** Adresse für den QR-Code. */
export interface QrAdresse {
  name: string
  strasse?: string | null
  hausnummer?: string | null
  plz?: string | null
  ort?: string | null
  land?: string
}

/** IBAN ohne Leerzeichen, gross geschrieben. */
export const ibanKompakt = (iban: string) => iban.replace(/\s+/g, '').toUpperCase()

/** IBAN in Viererblöcken für die Anzeige. */
export const ibanAnzeige = (iban: string) =>
  ibanKompakt(iban)
    .replace(/(.{4})/g, '$1 ')
    .trim()

/**
 * Prüft eine IBAN für den Zahlteil: Schweiz oder Liechtenstein, 21 Zeichen, Prüfziffer (Modulo 97).
 * Eine QR-IBAN (Institut 30000–31999) braucht eine QR-Referenz und taugt hier nicht.
 */
export function ibanPruefen(iban: string): 'ok' | 'format' | 'pruefziffer' | 'qr_iban' {
  const i = ibanKompakt(iban)
  if (!/^(CH|LI)\d{2}[0-9A-Z]{17}$/.test(i)) return 'format'
  const umgestellt = (i.slice(4) + i.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  let rest = 0
  for (const ziffer of umgestellt) rest = (rest * 10 + Number(ziffer)) % 97
  if (rest !== 1) return 'pruefziffer'
  const institut = Number(i.slice(4, 9))
  if (institut >= 30000 && institut <= 31999) return 'qr_iban'
  return 'ok'
}

/** «Hauptstrasse 12a» → Strasse und Hausnummer (für die strukturierte Adresse). */
export function strasseTeilen(s: string | null | undefined): { strasse: string; hausnummer: string } {
  const t = (s ?? '').trim()
  const m = /^(.*?)\s+(\d+\s*[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)$/.exec(t)
  return m ? { strasse: m[1] ?? '', hausnummer: (m[2] ?? '').replace(/\s+/g, '') } : { strasse: t, hausnummer: '' }
}

/** Nur Zeichen, die der Swiss QR-Code erlaubt (Latin, ohne Steuerzeichen), und höchstens n Zeichen. */
function zeichen(s: string | null | undefined, n: number): string {
  return (s ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\u0020-\u007e\u00a0-\u017f\u20ac]/g, '')
    .trim()
    .slice(0, n)
}

function adresse(a: QrAdresse | null): string[] {
  if (!a) return ['', '', '', '', '', '', '']
  const teil = a.hausnummer == null ? strasseTeilen(a.strasse) : { strasse: a.strasse ?? '', hausnummer: a.hausnummer }
  return [
    'S',
    zeichen(a.name, 70),
    zeichen(teil.strasse, 70),
    zeichen(teil.hausnummer, 16),
    zeichen(a.plz, 16),
    zeichen(a.ort, 35),
    a.land ?? 'CH',
  ]
}

/**
 * Inhalt des Swiss QR-Codes. betragRappen null = Betrag offen lassen. Zeilen mit LF getrennt, ohne
 * abschliessenden Umbruch (die Richtlinien erlauben CR+LF oder LF).
 */
export function qrInhalt(e: {
  iban: string
  glaeubiger: QrAdresse
  betragRappen: number | null
  schuldner: QrAdresse | null
  mitteilung: string
}): string {
  const betrag = e.betragRappen == null ? '' : (e.betragRappen / 100).toFixed(2)
  return [
    'SPC',
    '0200',
    '1',
    ibanKompakt(e.iban),
    ...adresse(e.glaeubiger),
    ...['', '', '', '', '', '', ''], // endgültiger Zahlungsempfänger (nicht verwendet)
    betrag,
    'CHF',
    ...adresse(e.schuldner),
    'NON',
    '',
    zeichen(e.mitteilung, 140),
    'EPD',
  ].join('\n')
}
