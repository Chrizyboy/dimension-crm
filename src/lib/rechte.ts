import type { MeineAnmeldung, Recht } from '@/types/anmeldung'
import type { ModulMeta } from '@/types/modul'

/**
 * Hat die angemeldete Person ein Recht? Admin hat alle Rechte, «basis» jede aktive Person.
 * Nur für die Anzeige: was wirklich geladen werden darf, entscheidet die Datenbank (RLS).
 */
export function hatRecht(anmeldung: MeineAnmeldung | null, recht: Recht): boolean {
  if (!anmeldung) return false
  return recht === 'basis' || anmeldung.rechte.includes('admin') || anmeldung.rechte.includes(recht)
}

/**
 * Darf die Person diesen Bereich in der Seitenleiste sehen?
 * Ohne Anmeldung (Vorschau ohne Datenbank) ist alles sichtbar, wie in der Vorlage bei fehlender Freigabe.
 */
export function darfModul(modul: ModulMeta, anmeldung: MeineAnmeldung | null): boolean {
  if (!anmeldung) return true
  if (modul.recht && !hatRecht(anmeldung, modul.recht)) return false
  if (modul.immer || hatRecht(anmeldung, 'admin')) return true
  return anmeldung.bereiche.length === 0 || anmeldung.bereiche.includes(modul.id)
}
