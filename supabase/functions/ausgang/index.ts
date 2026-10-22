// Edge Function «ausgang»: «Jetzt senden» im Ausgangskorb. Sendet nur, was schon freigegeben ist; die
// Freigabe selbst passiert in der Datenbank (ausgang_freigeben) durch einen Menschen. Ohne diesen Knopf
// sendet der Zeitplan jede Minute.

import { starte } from '../_shared/funktion.ts'
import { ausgangAbarbeiten } from '../_shared/versand.ts'

starte({
  senden: { recht: 'basis', f: () => ausgangAbarbeiten(20) },
})
