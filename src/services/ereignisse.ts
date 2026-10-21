/**
 * Ereignis-Bus: So sprechen Module miteinander, ohne sich gegenseitig zu importieren.
 * Beispiel: Das Offerten-Modul meldet «offerte.angenommen», das Projekt-Modul reagiert darauf.
 * Später (Phase 12) speist derselbe Katalog die Automations-Engine in der Datenbank.
 */

/** Katalog aller Ereignisse mit ihren Daten. Neue Ereignisse hier ergänzen. */
export interface EreignisKatalog {
  'navigation.befehlspalette': undefined
  'daten.geaendert': { tabelle: string; id: string }
}

type Name = keyof EreignisKatalog
type Handler<N extends Name> = (daten: EreignisKatalog[N]) => void

const handlers = new Map<Name, Set<Handler<Name>>>()

/** Meldet ein Ereignis an alle Zuhörer. */
export function sende<N extends Name>(name: N, daten: EreignisKatalog[N]): void {
  handlers.get(name)?.forEach((h) => {
    h(daten)
  })
}

/** Hört auf ein Ereignis. Gibt eine Funktion zum Abmelden zurück. */
export function hoere<N extends Name>(name: N, handler: Handler<N>): () => void {
  const set = handlers.get(name) ?? new Set()
  set.add(handler as Handler<Name>)
  handlers.set(name, set)
  return () => set.delete(handler as Handler<Name>)
}
