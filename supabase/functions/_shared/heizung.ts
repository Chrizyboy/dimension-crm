// Heizung der Kunden-Gebäude aus dem Gebäuderegister (GWR) für die Zielgruppe «Wärmepumpe-Potenzial» im Marketing
// (Entscheid 0056). Gleicher Zugang wie der Grossprojekt-Monitor (api3.geo.admin.ch, ohne Schlüssel). Die Antworten
// sind Daten (Regel 7); gespeichert wird nur der Energieträger über «objekt_heizung_setzen».

import { dienst } from './datenbank.ts'
import { GeoAdmin, heizungAusGwr, istDienstAusfall, type GebaeudeSuche } from './gebaeude.ts'

/** Energieträger eines Gebäudes oder '' (nicht gefunden). */
export async function heizungSuchen(s: GebaeudeSuche, geo: GeoAdmin): Promise<string> {
  const lage = await geo.lage(s)
  if (!lage) return ''
  const gwr = await geo.gwr(lage.e, lage.n)
  return heizungAusGwr(gwr?.genh1) ?? ''
}

/** Zeitplan: bis zu `limit` Gebäude nachtragen; ist der Dienst nicht erreichbar, in einer Stunde wieder. */
export async function heizungenNachtragen(limit = 20, geo = new GeoAdmin()): Promise<string> {
  const offen = await dienst.rpc<GebaeudeSuche[]>('objekte_heizung_offen', { p_limit: limit })
  let n = 0
  for (const s of offen) {
    try {
      await dienst.rpc('objekt_heizung_setzen', { p_id: s.id, p_heizung: await heizungSuchen(s, geo) })
      n++
    } catch (f) {
      if (istDienstAusfall(f)) return `${n} geprüft, geo.admin nicht erreichbar`
      throw f
    }
  }
  return `${n} geprüft`
}
