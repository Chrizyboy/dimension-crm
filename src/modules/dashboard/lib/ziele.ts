import type { Bereich, KennzahlenEinstellungen, JahresZiel } from '../types'
import { tageZwischen } from './zeitraum'

/** Standardwerte, solange die Datenbank noch keine Einstellung liefert (Vorschau, alte Datenbank). */
export const STANDARD_EINSTELLUNGEN: KennzahlenEinstellungen = {
  ziele: {},
  wahrscheinlichkeit: { offeriert: 35, nachfassen: 20, vertagt: 10, alt: 5 },
  alt_tage: 90,
  richtwerte: { unterschrift_ibn_tage: 60, reaktion_prozent: 90, marge_prozent: 30 },
  quellen_kosten_rappen: {},
}

/** Wofür ein Ziel gilt: ganze Firma (Bereich), eine Person oder der Umsatz. */
export type ZielArt = { art: 'bereich'; bereich: Bereich } | { art: 'person'; id: string } | { art: 'umsatz' }

/** Jahresziel einer Art; «alle» = Gesamtziel oder, falls leer, Muri + Bulle. */
function jahresWert(z: JahresZiel | undefined, a: ZielArt): number | null {
  if (!z) return null
  if (a.art === 'umsatz') return z.umsatz ?? null
  if (a.art === 'person') return z.personen?.[a.id] ?? null
  if (a.bereich !== 'alle') return z[a.bereich] ?? null
  if (z.gesamt) return z.gesamt
  return z.muri || z.bulle ? (z.muri ?? 0) + (z.bulle ?? 0) : null
}

/**
 * Ziel für einen Zeitraum: Jahresziel anteilig nach Tagen (über Jahresgrenzen je Jahr gerechnet).
 * Null, wenn für ein betroffenes Jahr kein Ziel eingetragen ist: lieber kein Ziel als ein halbes.
 */
export function zielFuer(e: KennzahlenEinstellungen, a: ZielArt, von: string, bis: string): number | null {
  let summe = 0
  for (let j = Number(von.slice(0, 4)); j <= Number(bis.slice(0, 4)); j++) {
    const wert = jahresWert(e.ziele[String(j)], a)
    if (wert === null) return null
    const start = von > `${String(j)}-01-01` ? von : `${String(j)}-01-01`
    const ende = bis < `${String(j)}-12-31` ? bis : `${String(j)}-12-31`
    summe += (wert * tageZwischen(start, ende)) / tageZwischen(`${String(j)}-01-01`, `${String(j)}-12-31`)
  }
  return Math.round(summe)
}

/** Erreicht in Prozent vom Ziel (gerundet), null ohne Ziel. */
export function erreicht(wert: number, ziel: number | null): number | null {
  return ziel ? Math.round((wert / ziel) * 100) : null
}

/** Ton für einen Zielstand: ab 100 % gut, ab 90 % knapp, darunter kritisch. */
export function zielTon(prozent: number | null): 'ok' | 'warnung' | 'kritisch' | 'neutral' {
  if (prozent === null) return 'neutral'
  return prozent >= 100 ? 'ok' : prozent >= 90 ? 'warnung' : 'kritisch'
}

/** Einstellung aus der Datenbank mit Standardwerten auffüllen (fehlende Schlüssel bei älteren Ständen). */
export function mitStandard(wert: Partial<KennzahlenEinstellungen> | null | undefined): KennzahlenEinstellungen {
  return {
    ziele: wert?.ziele ?? {},
    wahrscheinlichkeit: { ...STANDARD_EINSTELLUNGEN.wahrscheinlichkeit, ...wert?.wahrscheinlichkeit },
    alt_tage: wert?.alt_tage ?? STANDARD_EINSTELLUNGEN.alt_tage,
    richtwerte: { ...STANDARD_EINSTELLUNGEN.richtwerte, ...wert?.richtwerte },
    quellen_kosten_rappen: wert?.quellen_kosten_rappen ?? {},
  }
}
