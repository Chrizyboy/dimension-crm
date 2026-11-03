/**
 * Auswahllisten, bei denen man neue Einträge anlegen und Einträge ausblenden darf. Bei allen anderen hängen
 * Abläufe am Schlüssel (Stände, Status, Zahlungsbedingungen …): dort nur Texte, Farbe und Reihenfolge ändern.
 */
export const FREIE_LISTEN: ReadonlySet<string> = new Set([
  'aktivitaet',
  'artikelkategorie',
  'dachform',
  'eigentum',
  'erreichbarkeit',
  'fahrzeugart',
  'finanzierung',
  'gebaeudeart',
  'geraeteart',
  'interesse',
  'komponente',
  'monitoring',
  'personal_dokument',
  'personal_gespraech',
  'personal_vertragsart',
  'personal_zivilstand',
  'qualifikation',
  'quelle',
  'servicekategorie',
  'zeithorizont',
])

/** Farben, die eine Auswahlliste tragen darf (Token-Namen, wie in der Datenbank). */
export const FARBEN = ['neutral', 'info', 'ok', 'warn', 'kritisch', 'marke'] as const

/**
 * Schlüssel für einen neuen Eintrag aus dem deutschen Text: klein, ohne Umlaute und Sonderzeichen,
 * eindeutig in der Liste («Messe Bulle» → «messe_bulle», sonst «messe_bulle_2»).
 */
export function neuerSchluessel(text: string, vorhanden: readonly string[]): string {
  const basis =
    text
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'eintrag'
  const belegt = new Set(vorhanden)
  if (!belegt.has(basis)) return basis
  for (let i = 2; ; i++) if (!belegt.has(`${basis}_${i}`)) return `${basis}_${i}`
}

/** Tauscht zwei Einträge und vergibt Reihenfolge 10, 20, 30 … neu (Lücken für spätere Einträge). */
export function verschiebe<T extends { id: string }>(
  liste: readonly T[],
  id: string,
  richtung: -1 | 1,
): (T & { reihenfolge: number })[] {
  const neu = [...liste]
  const i = neu.findIndex((x) => x.id === id)
  const j = i + richtung
  if (i >= 0 && j >= 0 && j < neu.length) {
    const a = neu[i]
    const b = neu[j]
    if (a && b) {
      neu[i] = b
      neu[j] = a
    }
  }
  return neu.map((x, k) => ({ ...x, reihenfolge: (k + 1) * 10 }))
}
