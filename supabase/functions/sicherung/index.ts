// Edge Function «sicherung» (Phase 16): «Jetzt sichern» und «Wiederherstellen» aus Einstellungen › Datensicherung.
// Nur die Administration. Herunterladen braucht keine Funktion: Die App holt die Datei direkt aus dem Speicher
// (Regel «sicherungen lesen» nur für Admins). Automatische Sicherungen stösst der Zeitplan an.

import { starte, textFeld } from '../_shared/funktion.ts'
import { DienstFehler } from '../_shared/http.ts'
import { sicherungEinspielen, sicherungErstellen } from '../_shared/sicherung.ts'

starte({
  erstellen: {
    recht: 'admin',
    f: async (_e, ich) => {
      const r = await sicherungErstellen('manuell', { id: ich.id, name: ich.name })
      if (!r) throw new DienstFehler('sicherung_laeuft', 409, 'Sicherung')
      return r
    },
  },
  wiederherstellen: {
    recht: 'admin',
    f: async (e, ich) => {
      // Zweite Sicherung gegen einen Fehlklick: Die App schickt «bestaetigt» erst nach dem Häkchen im Dialog.
      if (e.bestaetigt !== true) throw new DienstFehler('eingabe', 400, 'bestaetigt')
      return { anzahl: await sicherungEinspielen(textFeld(e, 'id'), { id: ich.id, name: ich.name }) }
    },
  },
})
