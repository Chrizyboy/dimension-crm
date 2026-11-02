import { supabase } from '@/services/supabase'
import type { Akte, AnlageAkte, Belegung, Leitstandzahlen, VerlaufArt } from '../types'

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

/** Einsatz planen oder ändern (Termin, Dauer, Leitung, Team); ohne Termin wird er entfernt. */
export async function einsatzPlanen(
  id: string,
  e: { termin_am: string | null; dauer_minuten: number | null; person_id: string | null; team: string[] },
): Promise<void> {
  const { error } = await db().rpc('service_einsatz', {
    p_id: id,
    p_termin: e.termin_am as string,
    p_dauer: e.dauer_minuten as number,
    p_person: e.person_id as string,
    p_team: e.team,
  })
  if (error) throw error
}

/**
 * Wer am Tag schon abwesend, auf einer Baustelle oder bei einem anderen Service-Termin ist, damit beim Planen
 * niemand doppelt eingeteilt wird (nur Hinweis, die Planung bleibt möglich).
 */
export async function ladeBelegung(datum: string, ohneFall: string): Promise<Belegung[]> {
  const [abw, bau, srv] = await Promise.all([
    db().from('abwesenheiten_alle').select('person_id, art').lte('von', datum).gte('bis', datum),
    db()
      .from('einsaetze')
      .select('personen, projekt:projekte(nummer)')
      .is('geloescht_am', null)
      .neq('art', 'geplant')
      .lte('von', datum)
      .gte('bis', datum),
    db().from('service_termine').select('id, nummer, personen').eq('datum', datum).neq('id', ohneFall),
  ])
  if (abw.error) throw abw.error
  if (bau.error) throw bau.error
  if (srv.error) throw srv.error
  const b: Belegung[] = []
  for (const a of abw.data) if (a.person_id) b.push({ person_id: a.person_id, grund: 'abwesend', text: a.art ?? '' })
  for (const e of bau.data as { personen: string[] | null; projekt: { nummer: string } | null }[])
    for (const p of e.personen ?? []) b.push({ person_id: p, grund: 'baustelle', text: e.projekt?.nummer ?? '' })
  for (const t of srv.data)
    for (const p of t.personen ?? []) b.push({ person_id: p, grund: 'service', text: t.nummer ?? '' })
  return b
}

/** Anlage-Akte: Komponenten, Kunde, Ort, Projekt, Wartungsverträge, Fälle, Rapporte, Dokumente. */
export async function ladeAnlageAkte(id: string): Promise<AnlageAkte> {
  const { data, error } = await db().rpc('anlage_akte', { p_id: id })
  if (error) throw error
  const a = (data ?? {}) as Partial<AnlageAkte>
  return {
    anlage: a.anlage ? { ...a.anlage, komponenten: liste(a.anlage.komponenten) } : null,
    kunde: a.kunde ?? null,
    ort: a.ort ?? null,
    projekt: a.projekt ?? null,
    vertraege: liste(a.vertraege),
    faelle: liste(a.faelle),
    rapporte: liste(a.rapporte),
    dokumente: liste(a.dokumente),
    rma_offen: a.rma_offen ?? 0,
  }
}

/** Seriennummer einer Komponente vor Ort ändern (alte Nummer bleibt im Verlauf des Falls). */
export async function seriennummerSetzen(fallId: string, nr: number, seriennummer: string): Promise<void> {
  const { error } = await db().rpc('service_seriennummer', { p_id: fallId, p_nr: nr, p_seriennummer: seriennummer })
  if (error) throw error
}
