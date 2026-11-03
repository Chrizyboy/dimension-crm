import type { Offerte } from '../types'

/** Ein Schritt der Offerte mit Datum, falls bekannt. */
export interface Schritt {
  id: string
  fertig: boolean
  am: string | null
}

/** Schritte einer Offerte vom Termin bis zum Werkvertrag, aus den Daten abgeleitet (nichts von Hand). */
export function offertSchritte(o: Offerte): Schritt[] {
  const versendet = !!o.angebotAm && o.status !== 'in_arbeit'
  const entschieden = o.status === 'angenommen' || o.status === 'verloren'
  return [
    { id: 'termin', fertig: !!o.terminAm || !!o.zurOfferteAm, am: o.terminAm?.slice(0, 10) ?? o.zurOfferteAm },
    { id: 'planung', fertig: versendet || o.eingangStatus === 'pruefung', am: null },
    { id: 'geprueft', fertig: versendet || !!o.freigabe, am: o.freigabe?.am?.slice(0, 10) ?? null },
    { id: 'versendet', fertig: versendet, am: o.angebotAm },
    { id: 'nachfassen', fertig: entschieden || o.nachfassSchritt > 0, am: entschieden ? null : o.faelligAm },
    { id: 'entscheid', fertig: entschieden, am: o.entscheidAm },
    { id: 'werkvertrag', fertig: o.werkvertragStatus === 'unterschrieben', am: null },
  ]
}
