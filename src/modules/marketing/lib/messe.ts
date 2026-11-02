import type { Checkpunkt, Standdienst } from '../types'

/** Ein Messe-Lead, wie ihn das Handy erfasst (ID vom Gerät, damit nochmal Senden keinen zweiten Lead macht). */
export interface MesseLead {
  id: string
  kampagne_id: string
  vorname: string
  nachname: string
  telefon: string
  email: string
  plz: string
  ort: string
  sprache: 'de' | 'fr'
  interesse: string[]
  termin: boolean
  newsletter: boolean
  notiz: string
}

const SCHLUESSEL = 'dimension.messe.warteschlange'

function lies(speicher: Storage | undefined): MesseLead[] {
  try {
    const roh = speicher?.getItem(SCHLUESSEL)
    return roh ? (JSON.parse(roh) as MesseLead[]) : []
  } catch {
    return []
  }
}

function schreibe(liste: MesseLead[], speicher: Storage | undefined) {
  try {
    speicher?.setItem(SCHLUESSEL, JSON.stringify(liste))
  } catch {
    // Speicher voll oder gesperrt: dann bleibt nur der Versuch, sofort zu senden.
  }
}

const standard = () => (typeof localStorage === 'undefined' ? undefined : localStorage)

/**
 * Warteschlange für Messe-Leads ohne Netz (Messehallen haben oft keinen Empfang). Ein Lead bleibt im Gerät, bis
 * die Datenbank ihn bestätigt hat; `messe_lead_erfassen` ist wiederholbar, doppelt Senden schadet nicht.
 */
export const messeWarteschlange = {
  alle: (speicher = standard()) => lies(speicher),
  dazu(lead: MesseLead, speicher = standard()) {
    schreibe([...lies(speicher).filter((l) => l.id !== lead.id), lead], speicher)
  },
  weg(id: string, speicher = standard()) {
    schreibe(
      lies(speicher).filter((l) => l.id !== id),
      speicher,
    )
  },
}

/** Sendet alle wartenden Leads; gibt die Zahl der gesendeten zurück. Bricht beim ersten Fehler ab (kein Netz). */
export async function warteschlangeSenden(
  sende: (l: MesseLead) => Promise<unknown>,
  speicher = standard(),
): Promise<number> {
  let n = 0
  for (const l of messeWarteschlange.alle(speicher)) {
    try {
      await sende(l)
    } catch {
      break
    }
    messeWarteschlange.weg(l.id, speicher)
    n++
  }
  return n
}

/** Lead als Parameter für `messe_lead_erfassen` (leere Felder weg). */
export function alsParameter(l: MesseLead): Record<string, unknown> {
  return Object.fromEntries(Object.entries(l).filter(([, w]) => w !== '' && !(Array.isArray(w) && w.length === 0)))
}

/** Checkliste einer Messe: gespeicherte Punkte, sonst die Vorlage aus den Einstellungen. */
export function checkliste(
  gespeichert: Checkpunkt[] | undefined,
  vorlage: readonly string[] | undefined,
): Checkpunkt[] {
  if (gespeichert?.length) return gespeichert
  return (vorlage ?? []).map((text) => ({ text, erledigt: false }))
}

/** Tage einer Messe für den Standdienst (höchstens 14). */
export function messeTage(start: string | null, ende: string | null): string[] {
  if (!start) return []
  const aus: string[] = []
  const d = new Date(`${start}T12:00:00Z`)
  const bis = new Date(`${ende ?? start}T12:00:00Z`)
  while (d <= bis && aus.length < 14) {
    aus.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return aus
}

/** Standdienst je Tag: gespeicherter Eintrag oder leer 9–18 Uhr. */
export function standdienst(gespeichert: Standdienst[] | undefined, tage: readonly string[]): Standdienst[] {
  return tage.map((tag) => gespeichert?.find((s) => s.tag === tag) ?? { tag, von: '09:00', bis: '18:00', personen: [] })
}
