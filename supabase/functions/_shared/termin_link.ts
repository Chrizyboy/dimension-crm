// Prüft die Anfragen der Website an die Edge Function «termin», bevor etwas die Datenbank erreicht.

/** Was die Website will: freie Zeiten sehen oder eine Zeit buchen. */
export type TerminAnfrage =
  | { art: 'zeiten'; t: string }
  | { art: 'buchen'; t: string; beginn: string; notiz: string | null }
  | { art: 'fehler'; fehler: string }

const SCHLUESSEL = /^[A-Za-z0-9_-]{16,64}$/

/** Vergleicht zwei Texte in gleichbleibender Zeit (Schutz gegen Raten über die Antwortzeit). */
export function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/** Liest und prüft den Körper: Schlüssel aus dem Link, bei «buchen» eine Zeit (ISO) und optional eine kurze Notiz. */
export function terminAnfrage(k: unknown): TerminAnfrage {
  const o = (k && typeof k === 'object' ? k : {}) as Record<string, unknown>
  const t = typeof o.t === 'string' ? o.t.trim() : ''
  if (!SCHLUESSEL.test(t)) return { art: 'fehler', fehler: 'schluessel_link' }
  if (o.aktion === 'zeiten') return { art: 'zeiten', t }
  if (o.aktion !== 'buchen') return { art: 'fehler', fehler: 'aktion' }
  const beginn = typeof o.beginn === 'string' ? o.beginn : ''
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(beginn) || Number.isNaN(Date.parse(beginn))) {
    return { art: 'fehler', fehler: 'beginn' }
  }
  const notiz = typeof o.notiz === 'string' ? o.notiz.trim().slice(0, 500) : ''
  return { art: 'buchen', t, beginn: new Date(beginn).toISOString(), notiz: notiz || null }
}
