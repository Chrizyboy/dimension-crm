// Dachpotenzial für Leads (02.11.2026): zu jedem offenen Lead mit Adresse holt der Zeitplan sonnendach.ch und das
// Gebäuderegister (dieselben Dienste wie beim Grossprojekt-Monitor, ohne Schlüssel). Gespeichert wird unter
// objekte.dach.sonnendach über «lead_dach_speichern»; von Hand Eingetragenes bleibt. Antworten sind Daten (Regel 7).

import { dienst } from './datenbank.ts'
import { GeoAdmin, gebaeudeSuchen, istDienstAusfall } from './gebaeude.ts'

interface Offen {
  id: string
  strasse: string
  plz: string
  ort: string | null
}

/** Zeitplan: Dachdaten für bis zu `limit` Lead-Objekte holen; fällt der Dienst aus, später wieder versuchen. */
export async function leadsDachAnreichern(limit = 10, geo = new GeoAdmin()): Promise<string> {
  const offen = await dienst.rpc<Offen[]>('leads_dach_offen', { p_limit: limit })
  let n = 0
  for (const o of offen) {
    try {
      const r = await gebaeudeSuchen({ id: o.id, strasse: o.strasse, plz: o.plz, gemeinde: o.ort }, geo)
      await dienst.rpc('lead_dach_speichern', { p_objekt: o.id, p: r.daten, p_meldung: r.meldung })
      n++
    } catch (f) {
      if (istDienstAusfall(f)) return `${n} Dächer, geo.admin nicht erreichbar`
      throw f
    }
  }
  return `${n} ${n === 1 ? 'Dach' : 'Dächer'}`
}
