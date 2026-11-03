import type { Artikel, PreisHinweis, PreisRegeln } from '../types'

/** Tage zwischen zwei Daten (ISO), ganz. */
function tage(von: string, bis: Date): number {
  return Math.floor((bis.getTime() - new Date(von).getTime()) / 86_400_000)
}

/**
 * Handlungsbedarf eines Artikels für die Preisliste: Marge unter der Mindestmarge der Kategorie, Einkauf älter
 * als die Gültigkeit, kein Einkauf, Datenblatt DE oder FR fehlt, am Lager. Ohne Regeln (kein Recht «preise»)
 * nur Datenblatt und Lager.
 */
export function hinweise(a: Artikel, regeln: PreisRegeln | undefined, heute = new Date()): PreisHinweis[] {
  const h: PreisHinweis[] = []
  const kat = regeln?.kategorien?.[a.kategorie]
  if (kat && a.marge !== null && a.marge < kat.mindest) h.push('marge')
  if (regeln?.ek_gueltig_tage && a.ekStand && tage(a.ekStand, heute) > regeln.ek_gueltig_tage) h.push('ekAlt')
  if (regeln?.kategorien && a.ekRappen === null && a.vkRappen === null) h.push('ohneEk')
  if (!a.datenblaetter.de || !a.datenblaetter.fr) h.push('datenblatt')
  if (a.lagerFrei > 0) h.push('lager')
  return h
}

/** Alter des Einkaufs in Tagen (null ohne Stand). */
export function ekAlter(a: Pick<Artikel, 'ekStand'>, heute = new Date()): number | null {
  return a.ekStand ? tage(a.ekStand, heute) : null
}
