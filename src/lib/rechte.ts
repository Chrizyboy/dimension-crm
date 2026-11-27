import type { MeineAnmeldung, Recht } from '@/types/anmeldung'
import type { ModulMeta } from '@/types/modul'

/**
 * Hat die angemeldete Person ein Recht? Die Anmeldung liefert die wirksamen Rechte (Rolle, persönliche Rechte und
 * was «gl» mitbringt); «admin» ist nur das System, nicht mehr Oberbegriff. «basis» hat jede aktive Person.
 * Nur für die Anzeige: was wirklich geladen werden darf, entscheidet die Datenbank (RLS).
 */
export function hatRecht(anmeldung: MeineAnmeldung | null, recht: Recht): boolean {
  if (!anmeldung) return false
  return recht === 'basis' || anmeldung.rechte.includes(recht)
}

/**
 * Darf die Person diesen Bereich in der Seitenleiste sehen? System-Bereiche (Recht «admin») nach Recht, sonst nach
 * den freigegebenen Bereichen (Person, sonst Rolle). Alles sieht nur die Administration (Chris 27.11.2026: «Loris
 * und Chris sehen alles, der Rest muss von uns freigegeben werden»); ohne Freigabe nur, was «immer» gilt (Mein Tag).
 * Ohne Anmeldung (Vorschau ohne Datenbank) ist alles sichtbar.
 */
export function darfModul(modul: ModulMeta, anmeldung: MeineAnmeldung | null): boolean {
  if (!anmeldung) return true
  const rechte: readonly Recht[] =
    modul.recht === undefined ? [] : typeof modul.recht === 'string' ? [modul.recht] : modul.recht
  if (rechte.length > 0 && !rechte.some((r) => hatRecht(anmeldung, r))) return false
  if (modul.immer || rechte.includes('admin') || hatRecht(anmeldung, 'admin')) return true
  return anmeldung.bereiche.includes(modul.id)
}
