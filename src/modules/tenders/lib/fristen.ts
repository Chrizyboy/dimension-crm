/**
 * Fristenplan: alle Fristen der offenen Dossiers und die internen Schritte, die sich daraus rückwärts ergeben
 * (Prüfung durch zweite Person 3 Arbeitstage vor der Eingabe, Postversand «post_arbeitstage» vorher).
 */
import type { Dossier } from '../types'

/** Eine Zeile im Fristenplan. */
export interface FristEintrag {
  dossier: Dossier
  art: 'fragen' | 'begehung' | 'eingabe' | 'oeffnung' | 'pruefung' | 'post' | 'beschwerde' | 'zuschlag' | 'einsprache'
  am: string
}

/** Datum minus n Arbeitstage (Montag bis Freitag), als JJJJ-MM-TT. */
export function arbeitstageZurueck(datum: string, tage: number): string {
  const d = new Date(`${datum.slice(0, 10)}T12:00:00`)
  let n = 0
  while (n < tage) {
    d.setDate(d.getDate() - 1)
    const w = d.getDay()
    if (w !== 0 && w !== 6) n += 1
  }
  return d.toISOString().slice(0, 10)
}

const OFFEN_ANGEBOT = new Set(['pruefen', 'teilnahme', 'kalkulation'])

/** Alle Fristen ab heute (oder ab «von»), sortiert. Erledigte Schritte fallen weg. */
export function fristenplan(dossiers: Dossier[], o: { postTage?: number; von?: string } = {}): FristEintrag[] {
  const von = o.von ?? new Date().toISOString().slice(0, 10)
  const post = o.postTage ?? 2
  const liste: FristEintrag[] = []
  const dazu = (dossier: Dossier, art: FristEintrag['art'], am: string | null) => {
    if (am && am.slice(0, 10) >= von) liste.push({ dossier, art, am })
  }
  for (const d of dossiers) {
    const eingabe = d.frist_eingabe ?? d.frist
    if (d.spur === 'angebot') {
      if (OFFEN_ANGEBOT.has(d.status)) {
        dazu(d, 'fragen', d.frist_fragen)
        dazu(d, 'begehung', d.frist_begehung)
        dazu(d, 'eingabe', eingabe)
        if (eingabe && d.status !== 'pruefen' && !d.pruefung_am) dazu(d, 'pruefung', arbeitstageZurueck(eingabe, 3))
        if (eingabe && d.status !== 'pruefen' && !d.checkliste.versand)
          dazu(d, 'post', arbeitstageZurueck(eingabe, post))
      }
      if (d.status === 'eingereicht') {
        dazu(d, 'oeffnung', d.frist_oeffnung)
        dazu(d, 'zuschlag', d.zuschlag_erwartet)
      }
      if (d.status === 'absage') dazu(d, 'beschwerde', d.beschwerde_bis)
    } else if (d.art === 'baugesuch' && !['lead', 'kein_interesse', 'verworfen', 'archiviert'].includes(d.status)) {
      dazu(d, 'einsprache', eingabe)
    }
  }
  return liste.sort((a, b) => a.am.localeCompare(b.am))
}

/** Montag der Woche eines Datums (für die Gruppierung nach Kalenderwoche). */
export function wochenbeginn(datum: string): string {
  const d = new Date(`${datum.slice(0, 10)}T12:00:00`)
  const w = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - w)
  return d.toISOString().slice(0, 10)
}
