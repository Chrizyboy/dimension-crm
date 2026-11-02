import type { Bewegung, Woche } from '../types'

/** Knappe Woche in den nächsten Wochen: Endstand unter der Reserve, mit dem grössten offenen Eingang als Vorschlag. */
export interface Knapp {
  woche: Woche
  fehlt: number
  /** Grösster erwarteter Eingang (Rechnung oder Tranche), den man früher holen könnte. */
  vorschlag: Bewegung | null
}

/**
 * Erste Woche innerhalb von `wochen` (Standard 4), deren Endstand unter der Reserve liegt (Modul-Prüfung 25A:
 * Liquiditäts-Hinweis statt Glocke, weil die Vorschau in der App rechnet). Ohne Reserve gilt null als Grenze.
 */
export function knappeWoche(liste: readonly Woche[], reserve: number, wochen = 4): Knapp | null {
  const w = liste.slice(0, wochen).find((x) => x.ende < reserve)
  if (!w) return null
  const eingaenge = liste.flatMap((x) => x.bewegungen).filter((b) => b.richtung > 0)
  const vorschlag = eingaenge.reduce<Bewegung | null>((g, b) => (!g || b.rappen > g.rappen ? b : g), null)
  return { woche: w, fehlt: reserve - w.ende, vorschlag }
}
