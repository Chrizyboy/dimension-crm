// Entscheide von Chris zum Import (31.10.2026, Thread «Alle Daten im neuen CRM korrekt machen»).
// Import und Abgleich nutzen dieselben Regeln, damit der Abgleich prüft, was entschieden wurde.

import { zuRappen } from './umwandeln.mjs'

/** MWST-Satz, falls die Vorlage keinen hat (Stand 2024 ff.). */
export const MWST_STANDARD = 8.1

/**
 * MWST-Satz aus den Finanz-Einstellungen der Vorlage (finset.main.mwst).
 * @param {Record<string, any> | undefined} finset
 * @returns {number}
 */
export function mwstAusVorlage(finset) {
  return Number(finset?.main?.mwst) || MWST_STANDARD
}

/**
 * Entscheid 13/15B: Messe-Einträge werden nur Verkaufschancen, wenn die Person Beratung wünscht
 * (Besuch, Anruf oder Infos per Mail). Wer nur am Wettbewerb teilnahm, bleibt Kontakt (mit Einwilligung).
 * @param {Record<string, any>} lead Lead der Vorlage
 * @returns {boolean} true = kein Lead, nur Kontakt
 */
export function istMesseOhneWunsch(lead) {
  if (!lead.messe) return false
  const wunsch = Array.isArray(lead.messe.wunsch) ? lead.messe.wunsch : []
  return !wunsch.some((/** @type {unknown} */ w) => ['visit', 'call', 'mail'].includes(String(w)))
}

/**
 * Feste Quelle aus Herkunft statt Freitext: Entscheid 12A (Monitor → Ausschreibung) und Messe-Formular → Messe.
 * In der Vorlage standen diese als «Sonstiges» bzw. «Messe: …» und fielen sonst aus der Auswahlliste.
 * @param {Record<string, any>} lead Lead der Vorlage
 * @returns {'ausschreibung' | 'messe' | null} null = Quelle aus dem Feld «src»
 */
export function festeQuelle(lead) {
  if (lead.monitorNr) return 'ausschreibung'
  if (lead.messe || /^messe\b/i.test(String(lead.src ?? ''))) return 'messe'
  return null
}

/**
 * Entscheid 11B: Werkvertrag-Betrag ist inkl. MWST. Ohne Vertragswert gilt der Angebotswert (exkl.) plus MWST,
 * gleich gerundet wie die Kennzahl «Auftragswert» in der Datenbank.
 * @param {Record<string, any>} projekt Projekt der Vorlage
 * @param {number} mwst Satz in Prozent
 * @returns {{ betrag: number | null, mwstErgaenzt: boolean }} Betrag in Rappen
 */
export function werkvertragBetrag(projekt, mwst) {
  const vertrag = zuRappen(projekt.vertragswert)
  if (vertrag) return { betrag: vertrag, mwstErgaenzt: false }
  const angebot = zuRappen(projekt.angebotswert)
  if (angebot === null) return { betrag: vertrag, mwstErgaenzt: false }
  return { betrag: Math.round(angebot * (1 + mwst / 100)), mwstErgaenzt: true }
}
