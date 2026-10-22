import { supabase } from './supabase'

/**
 * Mails aus den Modulen (Offerte, Werkvertrag, Monatsbericht …) in den Ausgangskorb legen (Phase 8).
 * Gesendet wird nur auf dem Server, aus dem Postfach der Person, die die Mail erstellt.
 */

/** Was eine Mail braucht; die Bezüge erscheinen später in Zeitachse und Ausgangskorb. */
export interface MailEntwurf {
  an: string
  cc?: string
  betreff: string
  text: string
  sprache: 'de' | 'fr'
  /** Wozu (offerte, werkvertrag, monatsbericht, frei …), für die Anzeige im Ausgangskorb. */
  art: string
  kontakt_id?: string
  verkaufschance_id?: string
  offerte_id?: string
  projekt_id?: string
  bezug_tabelle?: string
  bezug_id?: string
  anhaenge: { dokument_id: string; name: string }[]
}

/**
 * Legt die Mail an. `freigeben: true` heisst: die Person hat den Text gesehen und «Senden» gedrückt
 * (das ist die Freigabe, Regel 6). Sonst wartet die Mail im Ausgangskorb. Gibt die ID zurück.
 */
export async function mailVorbereiten(entwurf: MailEntwurf, freigeben: boolean): Promise<string> {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  const { data, error } = await supabase.rpc('ausgang_anlegen', { p: { kanal: 'mail', ...entwurf, freigeben } })
  if (error) throw error
  return data
}
