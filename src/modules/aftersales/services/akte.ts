import { supabase } from '@/services/supabase'
import type { Akte, Leitstandzahlen, VerlaufArt } from '../types'

/** Datenzugriff für die Fall-Akte und den Leitstand (Abläufe in der Datenbank, service_*). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const liste = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** Kunde, Einsatzort, Anlage, Vertrag, frühere Fälle, Rapporte, Rechnungen und Mails zu einem Fall. */
export async function ladeAkte(id: string): Promise<Akte> {
  const { data, error } = await db().rpc('service_akte', { p_id: id })
  if (error) throw error
  const a = (data ?? {}) as Partial<Akte> & Record<string, unknown>
  return {
    kunde: a.kunde ?? null,
    ort: a.ort ?? null,
    anlage: a.anlage ? { ...a.anlage, komponenten: liste(a.anlage.komponenten) } : null,
    projekt: a.projekt ?? null,
    vertrag: a.vertrag ?? null,
    fruehere: liste(a.fruehere),
    rapporte: liste(a.rapporte),
    rechnungen: liste(a.rechnungen),
    mails: liste(a.mails),
    rma_offen: a.rma_offen ?? 0,
  }
}

/** Offene RMA beim Hersteller und Service-Rapporte, die noch verrechnet werden müssen. */
export async function ladeLeitstandzahlen(): Promise<Leitstandzahlen> {
  const { data, error } = await db().rpc('service_leitstand')
  if (error) throw error
  const z = (data ?? {}) as Partial<Leitstandzahlen>
  return { rma_offen: z.rma_offen ?? 0, zu_verrechnen: z.zu_verrechnen ?? 0 }
}

/** Eintrag im Verlauf: Notiz, Anruf, Mail oder SMS (festgehalten, nicht gesendet). */
export async function verlaufEintragen(id: string, art: VerlaufArt, text: string): Promise<void> {
  const { error } = await db().rpc('service_eintrag', { p_id: id, p_art: art, p_text: text })
  if (error) throw error
}

/** Schritt der Checkliste abhaken oder zurücknehmen. */
export async function checklisteSetzen(id: string, nr: number, erledigt: boolean): Promise<void> {
  const { error } = await db().rpc('service_checkliste', { p_id: id, p_nr: nr, p_erledigt: erledigt })
  if (error) throw error
}

/** Eigenen Schritt an die Checkliste anhängen. */
export async function checklisteDazu(id: string, text: string): Promise<void> {
  const { error } = await db().rpc('service_checkliste_dazu', { p_id: id, p_text: text })
  if (error) throw error
}

/** Bestehenden Kunden (und optional Anlage) zuordnen. */
export async function kundeZuordnen(id: string, kontakt: string, objekt: string | null): Promise<void> {
  const { error } = await db().rpc('service_zuordnen', {
    p_id: id,
    p_kontakt: kontakt,
    ...(objekt ? { p_objekt: objekt } : {}),
  })
  if (error) throw error
}

/** Neuen Kunden aus der Website-Meldung anlegen und zuordnen. */
export async function kundeAusMeldung(id: string): Promise<string> {
  const { data, error } = await db().rpc('service_kunde_aus_meldung', { p_id: id })
  if (error) throw error
  return data
}

/** Rechnungsentwurf aus einem kostenpflichtigen Rapport (Recht «finanzen»); gibt die Rechnungs-ID. */
export async function rechnungAusRapport(rapportId: string): Promise<string> {
  const { data, error } = await db().rpc('rechnung_entwurf', { p: { rapport_id: rapportId } as never })
  if (error) throw error
  return data
}
