import type { PostgrestError } from '@supabase/supabase-js'

/** So viele Zeilen gibt die Datenbank-Schnittstelle höchstens auf einmal zurück (Supabase «max_rows»). */
export const SEITE = 1000

/**
 * Holt alle Zeilen einer Abfrage Seite für Seite. Ohne das schneidet die Schnittstelle stillschweigend
 * nach 1000 Zeilen ab: die Kennzahlen «Alles» zählten so nur einen Teil (gefunden im Abgleich alt gegen neu).
 * Die Abfrage muss eindeutig sortiert sein, damit keine Zeile doppelt oder gar nicht kommt.
 * @param abfrage baut die Abfrage für die Zeilen `von` bis `bis` (beide eingeschlossen)
 */
export async function alleSeiten<T>(
  abfrage: (von: number, bis: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const zeilen: T[] = []
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await abfrage(von, von + SEITE - 1)
    if (error) throw error
    zeilen.push(...(data ?? []))
    if (!data || data.length < SEITE) return zeilen
  }
}
