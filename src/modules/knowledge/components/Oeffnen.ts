import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { dateiAdresse } from '../services/handbuch'
import type { HandbuchDatei } from '../types'

/**
 * Öffnet ein PDF in einem neuen Fenster. Das Fenster geht sofort auf (sonst blockiert es der Browser),
 * die kurz gültige Adresse kommt danach.
 */
export async function oeffneDatei(d: HandbuchDatei | null): Promise<void> {
  if (!d) {
    melde('warnung', { de: 'Zu diesem Eintrag ist keine Datei hinterlegt', fr: 'Aucun fichier pour cette entrée' })
    return
  }
  const fenster = window.open('', '_blank')
  if (fenster) fenster.opener = null
  try {
    const adresse = await dateiAdresse(d)
    if (!adresse) throw new Error('Keine Adresse')
    if (fenster) fenster.location.href = adresse
    else window.location.href = adresse
  } catch (f) {
    fenster?.close()
    meldeFehler(f, 'handbuch')
    melde('kritisch', { de: 'Datei konnte nicht geöffnet werden', fr: "Impossible d'ouvrir le fichier" })
  }
}
