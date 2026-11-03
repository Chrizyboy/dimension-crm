import { verkleinern } from '@/lib/bild'
import { supabase } from '@/services/supabase'
import { VERKLEINERN_AB, istBild } from '../lib/anhaenge'
import type { HandbuchDatei, HelpdeskStand, Meldung, MeldungStatus, NeueMeldung } from '../types'
import { dateiAblegen } from './handbuch'

/**
 * Meldungen («Fehler melden», V233 Helpdesk-Tickets). Jede Person sieht ihre eigenen, die Administration alle;
 * Status und Antwort setzt nur die Administration. Die Glocke meldet beides (Datenbank-Funktionen).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Meldungen, die die Person sehen darf, neueste zuerst. */
export async function ladeMeldungen(): Promise<Meldung[]> {
  const { data, error } = await db()
    .from('rueckmeldungen')
    .select(
      'id, nummer, titel, text, erwartet, bereich, prio, status, antwort, antwort_von, beantwortet_am, umgebung, ' +
        'person_id, erstellt_am, einschaetzung, entscheid, entscheid_notiz, entschieden_am, umgesetzt_in, ' +
        'person:personen!rueckmeldungen_person_id_fkey(name)',
    )
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data as unknown as (Omit<Meldung, 'person'> & { person: { name: string } | null })[]).map((m) => ({
    ...m,
    person: m.person?.name ?? null,
  }))
}

/** Was ohne Nachfragen hilft, einen Fehler nachzustellen: Browser, Fenstergrösse, Sprache, Adresse. */
export function umgebung(sprache: string): string {
  const fenster = `${String(window.innerWidth)}×${String(window.innerHeight)}`
  return [navigator.userAgent.slice(0, 160), fenster, sprache, window.location.hash.split('?')[0]].join(' · ')
}

/**
 * Meldung absenden, danach Bildschirmfotos und Dateien anhängen. Klappt ein Anhang nicht (z. B. Funkloch),
 * bleibt die Meldung trotzdem gesendet: `fehlend` sagt, wie viele fehlen, damit man sie nachreichen kann,
 * statt die Meldung ein zweites Mal zu schicken.
 */
export async function melden(
  n: NeueMeldung,
  sprache: string,
): Promise<{ id: string; nummer: number; fehlend: number }> {
  const { data, error } = await db().rpc('rueckmeldung_melden', {
    p_titel: n.titel,
    p_text: n.text,
    p_erwartet: n.erwartet,
    p_bereich: n.bereich,
    p_prio: n.prio,
    p_umgebung: umgebung(sprache),
  })
  if (error) throw error
  const r = data as { id: string; nummer: number }
  return { ...r, fehlend: await anhaengen(r.id, n.dateien) }
}

/** Grosse Fotos verkleinern (Handykamera), kleine Bildschirmfotos unverändert lassen, damit Text scharf bleibt. */
async function vorbereiten(f: File): Promise<{ blob: Blob; name: string }> {
  if (!istBild(f.type) || f.size <= VERKLEINERN_AB || f.type === 'image/gif') return { blob: f, name: f.name }
  const blob = await verkleinern(f, 2000, 0.85)
  if (blob === f) return { blob: f, name: f.name }
  return { blob, name: f.name.replace(/\.[^.]+$/, '') + '.jpg' }
}

/**
 * Bilder und Dateien an eine bestehende Meldung hängen (beim Melden oder nachgereicht). Gibt zurück, wie viele
 * nicht geklappt haben.
 */
export async function anhaengen(meldungId: string, dateien: File[]): Promise<number> {
  let fehlend = 0
  for (const datei of dateien) {
    try {
      const { blob, name } = await vorbereiten(datei)
      const id = await dateiAblegen(blob, name)
      const v = await db()
        .from('dokumente')
        .update({ bezug_tabelle: 'rueckmeldungen', bezug_id: meldungId, ordner: 'meldungen' })
        .eq('id', id)
      if (v.error) throw v.error
    } catch {
      fehlend++
    }
  }
  return fehlend
}

/** Status setzen und antworten (nur Administration). */
export async function beantworten(id: string, status: MeldungStatus, antwort: string): Promise<void> {
  const { error } = await db().rpc('rueckmeldung_beantworten', { p_id: id, p_status: status, p_antwort: antwort })
  if (error) throw error
}

/** «Erledige es» oder «Nicht» (nur die entscheidende Person); erst danach wird etwas geändert. */
export async function entscheiden(id: string, entscheid: 'erledigen' | 'nicht', notiz: string): Promise<void> {
  const { error } = await db().rpc('rueckmeldung_entscheiden', { p_id: id, p_entscheid: entscheid, p_notiz: notiz })
  if (error) throw error
}

/** Wer entscheidet und ob eine SMS kommt (nur Administration). */
export async function ladeHelpdeskStand(): Promise<HelpdeskStand> {
  const { data, error } = await db().rpc('helpdesk_stand')
  if (error) throw error
  return data as unknown as HelpdeskStand
}

/** Entscheidende Personen und SMS festlegen (nur Administration); leere Liste = niemand bestimmt. */
export async function helpdeskEinstellen(personen: string[], sms: boolean): Promise<void> {
  const { error } = await db().rpc('helpdesk_einstellen', { p_personen: personen, p_sms: sms })
  if (error) throw error
}

/** Anhänge einer Meldung, älteste zuerst (so wie sie angehängt wurden). */
export async function ladeAnhaenge(meldungId: string): Promise<HandbuchDatei[]> {
  const { data, error } = await db()
    .from('dokumente')
    .select('id, name, mime_typ, bytes, speicher_pfad, sharepoint_url')
    .eq('bezug_tabelle', 'rueckmeldungen')
    .eq('bezug_id', meldungId)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Kurz gültige Adressen (10 Minuten) für die Vorschaubilder einer Meldung, in einer Abfrage.
 * Der Speicher bleibt privat; ein weitergegebener Link verfällt bald.
 */
export async function bildAdressen(dateien: HandbuchDatei[]): Promise<Record<string, string>> {
  const bilder = dateien.filter((d) => istBild(d.mime_typ) && d.speicher_pfad)
  if (!bilder.length) return {}
  const { data, error } = await db()
    .storage.from('dokumente')
    .createSignedUrls(
      bilder.map((d) => d.speicher_pfad as string),
      600,
    )
  if (error) throw error
  const adressen: Record<string, string> = {}
  for (const d of bilder) {
    const u = data.find((x) => x.path === d.speicher_pfad)?.signedUrl
    if (u) adressen[d.id] = u
  }
  return adressen
}
