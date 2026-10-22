import type { Dossier, DossierStatus } from '../types'

type Ton = 'neutral' | 'marke' | 'info' | 'ok' | 'warnung' | 'kritisch'

/** Farbe der Statusmarke: wartet auf jemanden = Warnung, unterwegs = Info, Erfolg = ok. */
export const STATUS_TON: Record<DossierStatus, Ton> = {
  pruefen: 'warnung',
  teilnahme: 'info',
  kalkulation: 'info',
  eingereicht: 'marke',
  zuschlag: 'ok',
  absage: 'neutral',
  nicht_teilnehmen: 'neutral',
  kontakt_fehlt: 'kritisch',
  entwurf: 'warnung',
  bewilligt: 'info',
  versendet: 'marke',
  nachfassen: 'warnung',
  antwort: 'info',
  lead: 'ok',
  kein_interesse: 'neutral',
  beobachten: 'neutral',
  spaeter: 'neutral',
  verworfen: 'neutral',
  archiviert: 'neutral',
}

/** Priorität als Farbe: A dringend, B normal, C wenn Zeit bleibt. */
export const PRIO_TON: Record<string, Ton> = { A: 'kritisch', B: 'warnung', C: 'neutral' }

/** Abgeschlossene Dossiers (für den Filter «erledigt»). */
export const ERLEDIGT: DossierStatus[] = [
  'zuschlag',
  'absage',
  'nicht_teilnehmen',
  'lead',
  'kein_interesse',
  'verworfen',
  'archiviert',
]

/** Tage bis zu einem Datum (negativ = vorbei); null ohne Datum. */
export function tageBis(datum: string | null, heute = new Date()): number | null {
  if (!datum) return null
  const d = new Date(`${datum.slice(0, 10)}T12:00:00`)
  const h = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate(), 12)
  return Math.round((d.getTime() - h.getTime()) / 86_400_000)
}

/** Ton einer Frist: unter 7 Tagen kritisch, unter 21 Tagen Warnung. */
export function fristTon(datum: string | null): Ton {
  const t = tageBis(datum)
  if (t == null) return 'neutral'
  if (t < 7) return 'kritisch'
  if (t < 21) return 'warnung'
  return 'neutral'
}

/** Ort kurz: «Lenzburg AG» oder «–». */
export function ortKurz(d: Pick<Dossier, 'gemeinde' | 'kanton'>): string {
  return [d.gemeinde, d.kanton].filter(Boolean).join(' ') || '–'
}

/** Mail-Adresse, Adresse oder Telefon eines Anschreibens als eine Zeile. */
export function empfaengerZeile(a: { an: string | null; empfaenger: string }): string {
  return a.an && a.an !== a.empfaenger ? `${a.empfaenger} · ${a.an}` : a.empfaenger
}
