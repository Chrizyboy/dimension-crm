import type { Mail } from '../types'

/** Was als Nächstes mit einer Mail zu tun ist (Kasten «Nächster Schritt» in der Mail). */
export type Schritt =
  'nachfassen' | 'lead' | 'fall' | 'zahlung' | 'liefertermin' | 'rechnung' | 'offerte' | 'projekt' | 'fallOeffnen'

/**
 * Nächster Schritt je nach Art und Akte: Nachfassen (Kunde hat nicht geantwortet), Anfrage → Lead, Störung →
 * Service-Fall, Lieferantenrechnung → Zahlung erfassen, Auftragsbestätigung → Liefertermin übernehmen, Frage zu einer
 * unserer Rechnungen → Rechnung, Kunde mit Offerte → Offerte, Amt/Netzbetreiber mit Projekt → Projekt-Fahrplan.
 * Nur für offene Mails; null, wenn nichts Bestimmtes ansteht.
 */
export function naechsterSchritt(m: Mail): Schritt | null {
  if (m.stand === 'erledigt' || m.stand === 'abgelegt') return null
  if (m.nachfassen) return 'nachfassen'
  if (m.art === 'anfrage' && !m.lead) return 'lead'
  if (m.art === 'stoerung') return m.fall ? 'fallOeffnen' : 'fall'
  if (m.art === 'rechnung' && !m.rechnung && !m.kontakt && !m.zahlung_id) return 'zahlung'
  if (m.art === 'rechnung' && m.rechnung) return 'rechnung'
  if (m.art === 'lieferant' && (m.ki_werte.liefertermin || m.bestellung)) return 'liefertermin'
  if (m.art === 'amt' && m.projekt) return 'projekt'
  if (m.offerte && !m.projekt) return 'offerte'
  if (m.projekt) return 'projekt'
  return null
}

/** Wohin ein Anhang abgelegt werden kann: alle Akten, mit denen die Mail verknüpft ist. */
export function ablageZiele(m: Mail): { tabelle: string; id: string; schluessel: string; nummer: string }[] {
  const z: { tabelle: string; id: string; schluessel: string; nummer: string }[] = []
  if (m.projekt) z.push({ tabelle: 'projekte', id: m.projekt.id, schluessel: 'projekt', nummer: m.projekt.nummer })
  if (m.offerte) z.push({ tabelle: 'offerten', id: m.offerte.id, schluessel: 'offerte', nummer: m.offerte.nummer })
  if (m.fall) z.push({ tabelle: 'service_faelle', id: m.fall.id, schluessel: 'fall', nummer: m.fall.nummer })
  if (m.bestellung)
    z.push({ tabelle: 'bestellungen', id: m.bestellung.id, schluessel: 'bestellung', nummer: m.bestellung.nummer })
  if (m.rechnung)
    z.push({ tabelle: 'rechnungen', id: m.rechnung.id, schluessel: 'rechnung', nummer: m.rechnung.nummer ?? '' })
  if (m.zahlung_id) z.push({ tabelle: 'kreditor_zahlungen', id: m.zahlung_id, schluessel: 'zahlung', nummer: '' })
  if (m.lead) z.push({ tabelle: 'verkaufschancen', id: m.lead.id, schluessel: 'lead', nummer: m.lead.nummer })
  if (m.kontakt) z.push({ tabelle: 'kontakte', id: m.kontakt.id, schluessel: 'kunde', nummer: m.kontakt.name })
  return z
}
