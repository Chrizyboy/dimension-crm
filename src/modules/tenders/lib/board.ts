/** Leitstand: welche Spalten je Spur, welcher Stand in welche Spalte gehört und was in einer Spalte oben steht. */
import type { Dossier, DossierStatus, Spur } from '../types'
import { tageBis } from './anzeige'

/** Eine Spalte des Boards: Schlüssel (für Text) und die Stände, die dazugehören. */
export interface BoardSpalte {
  id: string
  status: DossierStatus[]
}

/** Spalten je Spur, in der Reihenfolge der Arbeit. «Entschieden» zeigt nur die letzten 12 Monate. */
export const BOARD: Record<Spur, BoardSpalte[]> = {
  angebot: [
    { id: 'gng', status: ['pruefen'] },
    { id: 'kalkulation', status: ['teilnahme', 'kalkulation'] },
    { id: 'eingereicht', status: ['eingereicht'] },
    { id: 'entschieden', status: ['zuschlag', 'absage', 'nicht_teilnehmen'] },
  ],
  akquise: [
    { id: 'kontakt_fehlt', status: ['kontakt_fehlt', 'pruefen'] },
    { id: 'entwurf', status: ['entwurf'] },
    { id: 'bewilligt', status: ['bewilligt'] },
    { id: 'versendet', status: ['versendet', 'nachfassen'] },
    { id: 'antwort', status: ['antwort', 'lead', 'kein_interesse'] },
  ],
  beobachten: [{ id: 'beobachten', status: ['beobachten', 'spaeter'] }],
}

/** Wichtigste Frist eines Dossiers: die nächste noch offene (Fragen, Begehung, Eingabe), sonst die Eingabe. */
export function naechsteFrist(d: Pick<Dossier, 'frist_fragen' | 'frist_begehung' | 'frist_eingabe' | 'frist'>): {
  art: 'fragen' | 'begehung' | 'eingabe'
  am: string
} | null {
  const alle = (
    [
      ['fragen', d.frist_fragen],
      ['begehung', d.frist_begehung],
      ['eingabe', d.frist_eingabe ?? d.frist],
    ] as const
  ).filter((x): x is readonly ['fragen' | 'begehung' | 'eingabe', string] => Boolean(x[1]))
  const offen = alle.find(([, am]) => (tageBis(am) ?? -1) >= 0)
  const [art, am] = offen ?? alle[alle.length - 1] ?? []
  return art && am ? { art, am } : null
}

/** Sortierung in einer Spalte: Prio A zuerst, dann nach der nächsten Frist, dann neueste. */
export function sortiere(a: Dossier, b: Dossier): number {
  const pa = a.prioritaet ?? 'Z'
  const pb = b.prioritaet ?? 'Z'
  if (pa !== pb) return pa.localeCompare(pb)
  const fa = naechsteFrist(a)?.am ?? '9999'
  const fb = naechsteFrist(b)?.am ?? '9999'
  if (fa !== fb) return fa.localeCompare(fb)
  return b.erstellt_am.localeCompare(a.erstellt_am)
}

/** Dossiers einer Spur auf die Spalten verteilen. */
export function verteile(dossiers: Dossier[], spur: Spur): { spalte: BoardSpalte; karten: Dossier[] }[] {
  return BOARD[spur].map((spalte) => ({
    spalte,
    karten: dossiers.filter((d) => d.spur === spur && spalte.status.includes(d.status)).sort(sortiere),
  }))
}
