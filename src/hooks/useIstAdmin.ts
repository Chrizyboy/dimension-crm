import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'

/**
 * Darf die angemeldete Person Einstellungen ändern? Nur die Administration (Chris, 3.11.2026: «die die nicht
 * admin sind sollen keine einstellungen vornehmen können ausser es betrifft sie selbst»). Die Datenbank prüft
 * dasselbe; hier geht es darum, Felder gar nicht erst änderbar anzuzeigen. Ohne Anmeldung (Vorschau) ja.
 */
export function useIstAdmin(): boolean {
  const status = useAnmeldung((z) => z.status)
  const ich = useAnmeldung((z) => z.ich)
  return status !== 'angemeldet' || hatRecht(ich, 'admin')
}
