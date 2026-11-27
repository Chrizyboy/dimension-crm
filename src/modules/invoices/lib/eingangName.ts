import type { Abgrenzung } from '../types'

/**
 * Dateiname, Ablage-Jahr und Abgrenzung einer Eingangsrechnung, gleich gerechnet wie in der Datenbank
 * (intern.eingang_dateiname, eingang_ablage_jahr, eingang_abgrenzung), damit das Formular sie schon vor dem
 * Speichern zeigt.
 */

/** Zeichen, die SharePoint/Windows in Namen nicht mag (und «_» als Trenner), durch «-» ersetzen. */
export function namensteil(s: string | null | undefined): string | null {
  const t = (s ?? '')
    .replace(/[\\/:*?"<>|#%_]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[ .]+|[ .]+$/g, '')
    .slice(0, 80)
  return t || null
}

/** «JJJJMMTT_Rechnungssteller_Rechnungsnummer_Grund.pdf»; leere Teile fallen weg. */
export function eingangDateiname(datum: string, lieferant: string, nummer: string, grund: string): string {
  const teile = [datum ? datum.replaceAll('-', '') : null, namensteil(lieferant), namensteil(nummer), namensteil(grund)]
  return `${teile.filter(Boolean).join('_')}.pdf`
}

/** Jahr der Ablage: Beginn der Leistungsperiode, sonst Rechnungsdatum. */
export function ablageJahr(datum: string, periodeVon: string, heute: string): number {
  return Number((periodeVon || datum || heute).slice(0, 4))
}

const tag = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
const tageZwischen = (von: string, bis: string) => Math.round((tag(bis) - tag(von)) / 86_400_000) + 1

/** Anteil der Periode je Jahr; «noetig», wenn ein Teil nicht im Jahr des Rechnungsdatums liegt. */
export function abgrenzung(datum: string, von: string, bis: string, betragRappen: number): Abgrenzung | null {
  if (!von || !bis || bis < von) return null
  const total = tageZwischen(von, bis)
  const erstes = Number(von.slice(0, 4))
  const letztes = Number(bis.slice(0, 4))
  const jahre: Abgrenzung['jahre'] = []
  let rest = betragRappen
  for (let j = erstes; j <= letztes; j++) {
    const a = von > `${String(j)}-01-01` ? von : `${String(j)}-01-01`
    const b = bis < `${String(j)}-12-31` ? bis : `${String(j)}-12-31`
    const tage = tageZwischen(a, b)
    const rappen = j === letztes ? rest : Math.round((betragRappen * tage) / total)
    rest -= rappen
    jahre.push({ jahr: j, tage, rappen })
  }
  const buchungsjahr = datum ? Number(datum.slice(0, 4)) : null
  return { noetig: buchungsjahr !== null && (erstes !== buchungsjahr || letztes !== buchungsjahr), buchungsjahr, jahre }
}
