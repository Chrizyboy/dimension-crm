import { rufeFunktion } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type { NetzStand } from '../types'

/** Netzbetreiber-Verzeichnis der ElCom (Entscheid 0049). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Stand des Netzbetreiber-Verzeichnisses. */
export async function ladeNetzStand(): Promise<NetzStand> {
  const { data, error } = await db().rpc('netzbetreiber_stand')
  if (error) throw error
  return data as unknown as NetzStand
}

/**
 * ElCom-Verzeichnis einlesen, Schritt für Schritt (jeder Aufruf kurz): Verzeichnis, dann Gemeinden je PLZ in
 * Paketen, dann Netzbetreiber zuordnen. `fortschritt` meldet jeden Schritt für die Anzeige.
 */
export async function lieseNetzbetreiberEin(
  fortschritt: (s: { schritt: string; plz?: number; zeilen?: number }) => void,
): Promise<{ neu: number; gebaeude: number }> {
  let schritt: string | null = 'verzeichnis'
  let plz = 0
  // Höchstens 60 Pakete à 120 PLZ (die Schweiz hat rund 3'400 PLZ): schützt vor einer Endlosschleife.
  for (let i = 0; i < 64 && schritt; i++) {
    const r: { naechster: string | null; zeilen?: number; plz?: number; neu?: number; gebaeude?: number } =
      await rufeFunktion('adressbuch', 'netzbetreiber_einlesen', { schritt })
    if (r.plz) plz += r.plz
    fortschritt({ schritt, plz, ...(r.zeilen !== undefined ? { zeilen: r.zeilen } : {}) })
    if (schritt === 'plz' && r.naechster === 'plz' && !r.plz) break
    if (schritt === 'zuordnen') return { neu: r.neu ?? 0, gebaeude: r.gebaeude ?? 0 }
    schritt = r.naechster
  }
  return { neu: 0, gebaeude: 0 }
}
