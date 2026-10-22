// Edge Function «ausschreibungen»: Quellen des Ausschreibungs-Monitors von Hand abrufen (Knopf «Jetzt
// abrufen» auf der Seite «Quellen»). Sonst liest der Zeitplan die Quellen von selbst. Die Quellen sind
// öffentlich und brauchen keinen Schlüssel; gespeichert wird über die Datenbank-Funktionen.

import { quelleLesen } from '../_shared/ausschreibungen.ts'
import { starte, textFeld } from '../_shared/funktion.ts'
import { DienstFehler } from '../_shared/http.ts'

starte({
  lesen: {
    recht: 'basis',
    f: async (e) => {
      const quelle = textFeld(e, 'quelle')
      if (quelle !== 'simap' && quelle !== 'amtsblatt') throw new DienstFehler('eingabe', 400, 'quelle')
      const tage = Math.min(30, Math.max(1, Number(e.tage) || 3))
      return { ergebnis: await quelleLesen(quelle, tage) }
    },
  },
})
