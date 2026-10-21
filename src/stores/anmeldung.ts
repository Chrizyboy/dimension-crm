import { create } from 'zustand'
import { ladeMeineAnmeldung } from '@/services/anmeldung'
import { meldeFehler } from '@/services/fehler'
import { supabase } from '@/services/supabase'
import type { Anmeldestatus, MeineAnmeldung } from '@/types/anmeldung'

interface AnmeldungZustand {
  status: Anmeldestatus
  /** Person, Rolle und Rechte; null solange nicht angemeldet. */
  ich: MeineAnmeldung | null
  /** E-Mail des Logins, auch wenn keine Person dazu gehört (für «kein Zugang»). */
  loginEmail: string | null
  /** Lädt Person und Rechte neu, z. B. nach «Mein Konto speichern». */
  aktualisiere: () => Promise<void>
}

/**
 * Wer ist angemeldet und was darf die Person? Einzige Quelle für Rechte in der Oberfläche.
 * Ohne Supabase-Adresse (Vorschau) bleibt der Status «ohne-datenbank» und alles ist sichtbar.
 */
export const useAnmeldung = create<AnmeldungZustand>()((set) => ({
  status: supabase ? 'laden' : 'ohne-datenbank',
  ich: null,
  loginEmail: null,
  aktualisiere: async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    const email = data.session?.user.email ?? null
    if (!data.session) {
      set({ status: 'abgemeldet', ich: null, loginEmail: null })
      return
    }
    try {
      const ich = await ladeMeineAnmeldung()
      set({ status: ich ? 'angemeldet' : 'kein-zugang', ich, loginEmail: email })
    } catch (fehler) {
      meldeFehler(fehler, 'anmeldung')
      set({ status: 'kein-zugang', ich: null, loginEmail: email })
    }
  },
}))

let gestartet = false

/** Hört auf An- und Abmeldungen (auch in anderen Fenstern). Einmal beim Start aufrufen. */
export function starteAnmeldung(): void {
  if (gestartet || !supabase) return
  gestartet = true
  void useAnmeldung.getState().aktualisiere()
  supabase.auth.onAuthStateChange((ereignis) => {
    // Token-Erneuerung ändert nichts an Person oder Rechten; nur echte Wechsel neu laden.
    if (ereignis === 'SIGNED_IN' || ereignis === 'SIGNED_OUT' || ereignis === 'USER_UPDATED') {
      // Ausserhalb des Callbacks, weil Supabase dort keine weiteren Abfragen erlaubt.
      setTimeout(() => void useAnmeldung.getState().aktualisiere(), 0)
    }
  })
}
