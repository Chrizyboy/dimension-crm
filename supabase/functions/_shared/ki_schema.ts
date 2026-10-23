// Bausteine für die JSON-Schemas der KI-Antworten (strukturierte Ausgabe). Die API verlangt bei jedem Objekt
// «additionalProperties: false» und kennt keine Längen- oder Zahlengrenzen; die prüfen wir nach dem Lesen selbst.

type Schema = Record<string, unknown>

/** Text. */
export const text: Schema = { type: 'string' }
/** Zahl mit Kommastellen. */
export const zahl: Schema = { type: 'number' }
/** Ganzzahl. */
export const ganz: Schema = { type: 'integer' }
/** Ja/Nein. */
export const janein: Schema = { type: 'boolean' }

/** Liste gleichartiger Einträge. */
export function liste(eintrag: Schema): Schema {
  return { type: 'array', items: eintrag }
}

/** Einer von festen Werten (z. B. Schlüssel einer Auswahlliste). */
export function wahl(werte: readonly string[]): Schema {
  return { type: 'string', enum: [...werte] }
}

/** Wert oder null (wenn die KI etwas nicht weiss). */
export function oderNull(s: Schema): Schema {
  return { anyOf: [s, { type: 'null' }] }
}

/** Objekt, alle Felder Pflicht (fehlende Werte als null), keine weiteren Felder. */
export function objekt(felder: Record<string, Schema>): Schema {
  return { type: 'object', properties: felder, required: Object.keys(felder), additionalProperties: false }
}

/** Text auf eine Länge kürzen (die API kennt keine maxLength). */
export function kurz(w: unknown, n: number): string {
  return typeof w === 'string' ? w.trim().slice(0, n) : ''
}

/** Nur Werte aus der Liste, sonst null. */
export function erlaubt<T extends string>(w: unknown, werte: readonly T[]): T | null {
  return typeof w === 'string' && (werte as readonly string[]).includes(w) ? (w as T) : null
}
