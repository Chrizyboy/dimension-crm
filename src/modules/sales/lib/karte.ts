import type { Geschaeft } from '../types'

/**
 * Google Maps an der Adresse des Leads, als Satellitenbild (V233 tbMapsUrl). Dient für den Screenshot
 * des Luftbilds und als QR-Code auf dem Terminblatt, damit man vor Ort direkt hinfährt.
 */
export function mapsLink(g: Pick<Geschaeft, 'strasse' | 'plz' | 'ort' | 'lageGenau' | 'breite' | 'laenge'>): string {
  if (g.lageGenau && g.breite !== null && g.laenge !== null)
    return `https://www.google.com/maps/@?api=1&map_action=map&center=${String(g.breite)},${String(g.laenge)}&zoom=20&basemap=satellite`
  const ort = [g.strasse, g.plz, g.ort, 'Schweiz'].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ort)}`
}
