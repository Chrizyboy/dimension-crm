import { supabase } from '@/services/supabase'
import { positionenAusDb } from '../lib/positionen'
import type { AuftragSchritt, OffertPosition, Werkvertrag } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Positionen der Offerte (Stückliste); einzeln geladen, damit die Vertragsliste klein bleibt. */
export async function ladePositionen(offerteId: string | null): Promise<OffertPosition[]> {
  if (!offerteId) return []
  const { data, error } = await db().from('offerten').select('stueckliste').eq('id', offerteId).maybeSingle()
  if (error) throw error
  return positionenAusDb(data?.stueckliste)
}

/** Fahrplan-Schritte des Projekts, die für den Stand des Auftrags zählen. */
const MONTAGE = ['montage', 'elektro']
const IBN = ['ibn', 'sina', 'kontrolle', 'abnahme']

/**
 * Stand des Auftrags von der unterschriebenen Offerte bis zur Schlussrechnung. Dokument und Anzahlung kommen
 * vom Vertrag, Montage, Inbetriebnahme und Schlussrechnung aus dem Fahrplan des Projekts (erledigt oder
 * nicht nötig). Beim Werkvertrag kommt die Unterschrift des Kunden als eigener Schritt dazu.
 */
export async function ladeAuftragStand(w: Werkvertrag): Promise<AuftragSchritt[]> {
  const schritte = w.projektId
    ? ((
        await db()
          .from('projekt_schritte')
          .select('schluessel, stand, erledigt_am')
          .eq('projekt_id', w.projektId)
          .is('geloescht_am', null)
      ).data ?? [])
    : []
  const fertig = (keys: string[]) => {
    const passend = schritte.filter((s) => keys.includes(s.schluessel))
    const erledigt = passend.length > 0 && passend.every((s) => s.stand === 'erledigt' || s.stand === 'nicht_noetig')
    const daten = passend.map((s) => s.erledigt_am).filter((d): d is string => !!d)
    return { erledigt, datum: erledigt && daten.length ? (daten.sort().at(-1) ?? null) : null }
  }
  return standAus(w, { montage: fertig(MONTAGE), ibn: fertig(IBN), schluss: fertig(['schluss']) })
}

/** Reine Berechnung des Stands (für Tests ohne Datenbank). */
export function standAus(
  w: Werkvertrag,
  projekt: Record<'montage' | 'ibn' | 'schluss', { erledigt: boolean; datum: string | null }>,
): AuftragSchritt[] {
  const letzte = w.zahlungsplan.at(-1)
  const schluss = projekt.schluss.erledigt || (w.zahlungsplan.length > 1 && !!letzte?.bezahltAm)
  return [
    { schluessel: 'offerte', erledigt: true, datum: w.erstelltDatum },
    { schluessel: 'versendet', erledigt: !!w.versendetAm || w.status === 'unterschrieben', datum: w.versendetAm },
    ...(w.angaben.art === 'auftragsbestaetigung'
      ? []
      : [{ schluessel: 'unterschrieben' as const, erledigt: !!w.unterschriebenAm, datum: w.unterschriebenAm }]),
    {
      schluessel: 'anzahlung',
      erledigt: !!w.anzahlung?.bezahltAm || !!w.zahlungsplan[0]?.bezahltAm,
      datum: w.anzahlung?.bezahltAm ?? w.zahlungsplan[0]?.bezahltAm ?? null,
    },
    { schluessel: 'montage', ...projekt.montage },
    { schluessel: 'ibn', ...projekt.ibn },
    { schluessel: 'schluss', erledigt: schluss, datum: projekt.schluss.datum ?? letzte?.bezahltAm ?? null },
  ]
}
