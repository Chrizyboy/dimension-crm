import { microsoft } from '@/services/integrationen'
import type { AbsenderRegel, Anhang, Art, Notiz, OffeneBestellung, TeamZeile, VerlaufMail } from '../types'
import { db } from './posteingang'

/**
 * Was der Arbeitsplatz zusätzlich braucht: Notizen, Absender-Regeln, Team-Übersicht, Aufgabe, Zahlung und
 * Liefertermin aus der Mail, dazu Unterhaltung und Anhänge aus Outlook (über die Server-Funktion «microsoft»).
 */

/** Interne Notizen einer Mail. */
export async function ladeNotizen(id: string): Promise<Notiz[]> {
  const { data, error } = await db().rpc('posteingang_notizen_von', { p_id: id })
  if (error) throw error
  return data
}

/** Notiz schreiben; @Kürzel oder @Vorname gibt der Person eine Glocke. */
export async function notizSchreiben(id: string, text: string): Promise<void> {
  const { error } = await db().rpc('posteingang_notiz', { p_id: id, p_text: text })
  if (error) throw error
}

/** Absender-Regeln (eigene und, wenn ich verteile, die für info@). */
export async function ladeAbsenderRegeln(): Promise<AbsenderRegel[]> {
  const { data, error } = await db()
    .from('posteingang_regeln')
    .select('id, postfach_person_id, absender, aktion, person_id, art')
    .is('geloescht_am', null)
    .order('absender')
  if (error) throw error
  return data as unknown as AbsenderRegel[]
}

/** Regel anlegen oder ersetzen (gleicher Absender im gleichen Postfach). */
export async function regelSpeichern(r: {
  absender: string
  aktion: AbsenderRegel['aktion']
  person_id?: string | null
  art?: Art | null
  team: boolean
}): Promise<void> {
  const { error } = await db().rpc('posteingang_regel_speichern', { p: r as never })
  if (error) throw error
}

/** Regel löschen (Papierkorb). */
export async function regelLoeschen(id: string): Promise<void> {
  const { error } = await db().rpc('posteingang_regel_loeschen', { p_id: id })
  if (error) throw error
}

/** Team-Übersicht (nur Zahlen). */
export async function ladeTeam(): Promise<TeamZeile[]> {
  const { data, error } = await db().rpc('posteingang_team')
  if (error) throw error
  return data as unknown as TeamZeile[]
}

/** Aufgabe aus der Mail (verknüpft). */
export async function aufgabeAnlegen(id: string, titel: string, faellig: string | null, person: string | null) {
  const { error } = await db().rpc('posteingang_aufgabe', {
    p_id: id,
    p_titel: titel,
    p_faellig: faellig as never,
    p_person: person as never,
  })
  if (error) throw error
}

/** Lieferantenrechnung als Zahlung erfassen (Recht «finanzen»). */
export async function zahlungErfassen(
  id: string,
  z: {
    firma: string
    rechnung_nr: string
    rechnung_am: string
    betrag_rappen: number
    faellig_am: string
    text: string
  },
): Promise<string> {
  const { data, error } = await db().rpc('posteingang_zahlung_erfassen', { p_id: id, p: z as never })
  if (error) throw error
  return data
}

/** Liefertermin in die Bestellung übernehmen (Recht «preise»). */
export async function lieferterminUebernehmen(id: string, bestellung: string, datum: string): Promise<void> {
  const { error } = await db().rpc('posteingang_liefertermin', { p_id: id, p_bestellung: bestellung, p_datum: datum })
  if (error) throw error
}

/** Bestellungen, die noch kommen (für «Liefertermin übernehmen»). */
export async function ladeOffeneBestellungen(): Promise<OffeneBestellung[]> {
  const { data, error } = await db()
    .from('bestellungen')
    .select('id, nummer, liefertermin, status, lieferant:lieferanten(name)')
    .is('geloescht_am', null)
    .in('status', ['freigegeben', 'bestellt', 'teilgeliefert'])
    .order('nummer', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data as unknown as (Omit<OffeneBestellung, 'lieferant'> & { lieferant: { name: string } | null })[]).map(
    ({ lieferant, ...b }) => ({ ...b, lieferant: lieferant?.name ?? '' }),
  )
}

/** Ganze Unterhaltung aus Outlook. */
export const ladeVerlauf = (id: string): Promise<VerlaufMail[]> => microsoft.posteingangVerlauf(id).then((r) => r.mails)

/** Anhänge aus Outlook. */
export const ladeAnhaenge = (id: string): Promise<Anhang[]> => microsoft.posteingangAnhaenge(id).then((r) => r.anhaenge)

/** Anhang öffnen: holt die Datei und öffnet sie in einem neuen Fenster (PDF, Bild) oder lädt sie herunter. */
export async function anhangOeffnen(id: string, anhang: Anhang): Promise<void> {
  const fenster = window.open('', '_blank')
  const a = await microsoft.posteingangAnhang(id, anhang.id)
  const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: a.typ }))
  if (fenster) fenster.location.href = url
  else {
    const link = document.createElement('a')
    link.href = url
    link.download = a.name
    link.click()
  }
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 60_000)
}

/** Anhang ins CRM übernehmen (bei Kunde, Lead, Offerte, Projekt, Fall, Rechnung, Bestellung oder Zahlung). */
export const anhangAblegen = (id: string, anhangId: string, tabelle: string, bezugId: string) =>
  microsoft.posteingangAnhangAblegen(id, anhangId, tabelle, bezugId)
