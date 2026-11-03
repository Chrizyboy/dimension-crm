import type { EinstellungsBereich, EinstellungsGruppe } from '@/types/einstellungen'
import type { Sprache } from '@/types/modul'

/** Reihenfolge der Gruppen in der Navigation. */
export const GRUPPEN: readonly EinstellungsGruppe[] = ['mich', 'firma', 'ablaeufe', 'system']

/** Alte Reiter-Namen aus Links (`?reiter=verbindungen`) auf die neuen Bereiche. */
export const ALTE_REITER: Record<string, string> = {
  personen: 'personen',
  rollen: 'rollen',
  zustaendigkeiten: 'zustaendigkeiten',
  verbindungen: 'verbindungen',
  sicherung: 'sicherung',
  betrieb: 'betrieb',
}

/** Kleinbuchstaben ohne Akzente, damit «regle» auch «Règles» findet. */
function normal(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Bereiche, die eine Person sieht, gefiltert nach Suche (Titel, Beschreibung, Stichworte in der
 * Sprache der Oberfläche und in der anderen, damit «Mahnfrist» auch auf Französisch gefunden wird).
 * @param darf prüft das Recht eines Bereichs
 */
export function sichtbareBereiche(
  bereiche: readonly EinstellungsBereich[],
  darf: (b: EinstellungsBereich) => boolean,
  suche = '',
): EinstellungsBereich[] {
  const woerter = normal(suche).split(/\s+/).filter(Boolean)
  return bereiche.filter((b) => {
    if (!darf(b)) return false
    if (woerter.length === 0) return true
    const text = normal(
      [b.titel.de, b.titel.fr, b.beschreibung.de, b.beschreibung.fr, b.stichworte?.de, b.stichworte?.fr].join(' '),
    )
    return woerter.every((w) => text.includes(w))
  })
}

/** Bereiche nach Gruppe, in fester Reihenfolge; leere Gruppen fallen weg. */
export function nachGruppen(
  bereiche: readonly EinstellungsBereich[],
): { gruppe: EinstellungsGruppe; bereiche: EinstellungsBereich[] }[] {
  return GRUPPEN.map((g) => ({ gruppe: g, bereiche: bereiche.filter((b) => b.gruppe === g) })).filter(
    (g) => g.bereiche.length > 0,
  )
}

/** Titel eines Bereichs in der Sprache der Oberfläche. */
export function titelVon(b: EinstellungsBereich, sprache: Sprache): string {
  return b.titel[sprache]
}
