import { microsoft } from './integrationen'
import { supabase } from './supabase'

/**
 * Was andere Bereiche aus einer Mail im Posteingang brauchen, ohne das Modul «Posteingang» zu importieren (Regel 2):
 * «Lead anlegen» (Anfragen & Leads) und «Service-Fall eröffnen» (Service & Garantie) aus einer Mail, danach die
 * Mail mit dem neuen Lead oder Fall verknüpfen.
 */

/** Angaben einer Mail als Vorlage. */
export interface MailVorlage {
  id: string
  betreff: string
  zusammenfassung: string | null
  vorschau: string | null
  von_email: string | null
  von_name: string | null
  kontakt: { id: string; name: string } | null
}

/** Eine Mail als Vorlage laden (RLS: nur wenn ich sie sehen darf). */
export async function mailVorlage(id: string): Promise<MailVorlage | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('posteingang')
    .select(
      'id, betreff, zusammenfassung, vorschau, von_email, von_name, kontakt:kontakte(id, vorname, nachname, firma)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const k = data.kontakt
  return {
    id: data.id,
    betreff: data.betreff ?? '',
    zusammenfassung: data.zusammenfassung,
    vorschau: data.vorschau,
    von_email: data.von_email,
    von_name: data.von_name,
    kontakt: k ? { id: k.id, name: [k.vorname, k.nachname].filter(Boolean).join(' ') || k.firma || '–' } : null,
  }
}

/** Ganzer Text der Mail (aus Outlook); ohne Verbindung die Vorschau. */
export async function mailVolltext(v: MailVorlage): Promise<string> {
  try {
    return (await microsoft.posteingangText(v.id)).text
  } catch {
    return [v.betreff, v.vorschau].filter(Boolean).join('\n\n')
  }
}

/** Die Mail mit einem neuen Lead oder Service-Fall (oder Kunden) verknüpfen. */
export async function mailVerknuepfen(
  id: string,
  felder: { verkaufschance_id?: string; service_fall_id?: string; kontakt_id?: string },
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('posteingang_setzen', { p_id: id, p_aktion: 'verknuepfen', p: felder })
  if (error) throw error
}
