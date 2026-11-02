import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { NachfassErgebnis, OffertEinstellungen, OffertVariante } from '../types'
import { variantenFuerDb } from './zeilen'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Standard, solange die Einstellung fehlt (gleich wie in der Migration 20261112010000). */
export const STANDARD_EINSTELLUNGEN: OffertEinstellungen = {
  gueltigTage: 30,
  zielArbeitstage: 5,
  nachfassPlan: [3, 10, 21, 30],
  freigabe: { aktiv: true, rabattAb: 5, margeUnter: 18, durch: ['chris'] },
  unterlagen: [],
}

/** Einstellungen der Offerten (Nachfass-Plan, Ziel, Freigabe-Schwellen, Unterlagen-Liste). */
export async function ladeOffertEinstellungen(): Promise<OffertEinstellungen> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'offerten').maybeSingle()
  if (error) throw error
  const w = (data?.wert ?? {}) as Record<string, unknown>
  const f = (w.freigabe ?? {}) as Record<string, unknown>
  const s = STANDARD_EINSTELLUNGEN
  return {
    gueltigTage: Number(w.gueltig_tage ?? s.gueltigTage),
    zielArbeitstage: Number(w.ziel_arbeitstage ?? s.zielArbeitstage),
    nachfassPlan: Array.isArray(w.nachfass_plan) ? w.nachfass_plan.map(Number) : s.nachfassPlan,
    freigabe: {
      aktiv: f.aktiv !== false,
      rabattAb: Number(f.rabatt_ab ?? s.freigabe.rabattAb),
      margeUnter: Number(f.marge_unter ?? s.freigabe.margeUnter),
      durch: Array.isArray(f.durch) ? f.durch.map(String) : s.freigabe.durch,
    },
    unterlagen: Array.isArray(w.unterlagen) ? (w.unterlagen as OffertEinstellungen['unterlagen']) : [],
  }
}

/**
 * Ergebnis beim Nachfassen erfassen. Die Datenbank setzt den nächsten Schritt nach dem Plan und gibt dessen Datum
 * zurück (null bei Ja/Nein).
 */
export async function erfasseNachfassen(
  offerteId: string,
  ergebnis: NachfassErgebnis,
  angaben: {
    notiz?: string
    datum?: string
    grund?: string
    variante?: string
    konkurrenz?: string
    art?: string
    entscheid_erwartet?: string
  } = {},
): Promise<string | null> {
  const { data, error } = await db().rpc('offerte_nachfassen', {
    p_offerte: offerteId,
    p_ergebnis: ergebnis,
    p: angaben as Json,
  })
  if (error) throw error
  return data
}

/** Angaben der Offerte ändern; nur mitgegebene Felder (null setzt zurück, z. B. Chance wieder automatisch). */
export async function setzeAngaben(
  offerteId: string,
  angaben: {
    gueltig_bis?: string | null
    chance_prozent?: number | null
    entscheid_erwartet?: string | null
    konkurrenz?: string | null
    rabatt_prozent?: number | null
    unterlagen?: Record<string, boolean>
    varianten?: OffertVariante[]
    variante?: string | null
  },
): Promise<void> {
  const { varianten, ...rest } = angaben
  const p = { ...rest, ...(varianten ? { varianten: variantenFuerDb(varianten) } : {}) }
  const { error } = await db().rpc('offerte_angaben_setzen', { p_offerte: offerteId, p: p as Json })
  if (error) throw error
}

/** Offerte vor dem Senden freigeben (Rabatt über der Schwelle oder Marge zu tief). */
export async function gibFrei(offerteId: string, notiz?: string): Promise<void> {
  const { error } = await db().rpc('offerte_freigeben', { p_offerte: offerteId, ...(notiz ? { p_notiz: notiz } : {}) })
  if (error) throw error
}
