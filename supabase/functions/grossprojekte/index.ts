// Edge Function «grossprojekte»: Gebäudedaten eines Grossprojekts sofort holen (nach dem Erfassen oder dem Ändern
// der Adresse). Sonst holt der Zeitplan sie stündlich. Die Dienste des Bundes sind öffentlich und brauchen keinen
// Schlüssel; gelesen und gespeichert wird mit dem Service-Schlüssel, darum prüft die Funktion zuerst, ob die Person
// das Grossprojekt sehen darf.

import { alsPerson, dienst } from '../_shared/datenbank.ts'
import { grossprojektAnreichern, istDienstAusfall, type GebaeudeSuche } from '../_shared/gebaeude.ts'
import { starte, textFeld } from '../_shared/funktion.ts'
import { DienstFehler } from '../_shared/http.ts'
import { pvBeiGebaeude } from '../_shared/pv_register.ts'

starte({
  anreichern: {
    recht: 'basis',
    f: async (e, ich) => {
      const id = textFeld(e, 'id')
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DienstFehler('eingabe', 400, 'id')
      const [g] = await alsPerson(ich).lies<GebaeudeSuche[]>(
        `grossprojekte?id=eq.${id}&geloescht_am=is.null&select=id,strasse,plz,gemeinde,parzelle`,
      )
      if (!g) throw new DienstFehler('weg', 404, 'Grossprojekt')
      try {
        const meldung = await grossprojektAnreichern(g)
        // Gleich auch die bestehende PV an diesem Gebäude prüfen (Bundesregister); ein belegtes Dach fällt heraus.
        const [lage] = await dienst.lies<
          { lage_e: number | null; lage_n: number | null; egid: string | null; grundflaeche_m2: number | null }[]
        >(`grossprojekte?id=eq.${id}&select=lage_e,lage_n,egid,grundflaeche_m2`)
        if (lage?.lage_e != null && lage.lage_n != null) {
          const kw = await pvBeiGebaeude({
            egid: lage.egid,
            e: Number(lage.lage_e),
            n: Number(lage.lage_n),
            grundflaeche_m2: lage.grundflaeche_m2,
          })
          await dienst.rpc('grossprojekt_pv_setzen', { p_id: id, p: { pv_bestand_kw: kw } })
        }
        return { meldung }
      } catch (f) {
        // Dienst des Bundes nicht erreichbar: kurzer Code für die App, der Zeitplan versucht es später wieder.
        if (istDienstAusfall(f)) throw new DienstFehler('geo_admin', 502, 'geo.admin')
        throw f
      }
    },
  },
})
