// Server-Aktionen der Automationen (Phase 12): was nur mit einem Zugang zu Microsoft oder AbaNinja geht.
// Die Datenbank hält den Lauf an («server»), der Zeitplan holt die offenen Schritte, führt sie hier aus und meldet
// das Ergebnis zurück. Fehlt eine Verbindung, wird der Schritt übersprungen statt den Lauf zu blockieren.

import * as aba from './abaninja.ts'
import { msEinstellungen } from './abgleich.ts'
import { dienst, type Ich } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { graph } from './microsoft.ts'
import { kundenordner, laufwerkId, ORDNER } from './sharepoint.ts'
import { terminEintragen } from './termin.ts'
import { eingerichtet } from './umgebung.ts'

/** Ein offener Server-Schritt, wie ihn automation_server_offen liefert. */
export interface ServerSchritt {
  lauf_id: string
  schritt: number
  art: 'outlook_termin' | 'sharepoint_ordner' | 'abaninja_kunde'
  tabelle: string | null
  bezug_id: string | null
  person_id: string | null
  kontakt_id: string | null
}

/** Ergebnis für das Protokoll (Schlüssel übersetzt die App: automationen.meldung.<meldung>). */
export interface ServerErgebnis {
  ergebnis: 'ok' | 'fehler' | 'uebersprungen'
  meldung: string
  werte?: Record<string, unknown>
  ziel?: string
}

const uebersprungen = (meldung: string): ServerErgebnis => ({ ergebnis: 'uebersprungen', meldung })

/** Fehler, die «geht gerade nicht» bedeuten (keine Verbindung), werden zu «übersprungen». */
const VERBINDUNG = new Set(['nicht_verbunden', 'neu_verbinden', 'anmeldung', 'nicht_eingerichtet'])

async function person(id: string): Promise<Ich | null> {
  const [p] = await dienst.lies<Ich[]>(
    `personen?id=eq.${encodeURIComponent(id)}&geloescht_am=is.null&select=id,kuerzel,name,email,rechte`,
  )
  return p ?? null
}

/** Termin im Outlook der zuständigen Person, ohne Einladung an den Kunden (das wäre Versand nach aussen). */
async function outlookTermin(s: ServerSchritt): Promise<ServerErgebnis> {
  if (s.tabelle !== 'verkaufschancen' || !s.bezug_id) return uebersprungen('nur_leads')
  const ich = s.person_id ? await person(s.person_id) : null
  if (!ich) return uebersprungen('kein_empfaenger')
  const v = await terminEintragen(ich, { verkaufschance_id: s.bezug_id, kunde_einladen: false })
  return { ergebnis: 'ok', meldung: 'outlook_eingetragen', werte: { an: ich.name, link: v.olEventLink } }
}

/** Ordner anlegen; gibt es ihn schon, ist das recht (409). */
async function ordner(personId: string, laufwerk: string, eltern: string, name: string) {
  const ziel = eltern
    ? `/drives/${laufwerk}/root:/${eltern.split('/').map(encodeURIComponent).join('/')}:/children`
    : `/drives/${laufwerk}/root/children`
  try {
    return await graph<{ id: string; webUrl: string }>(personId, ziel, {
      methode: 'POST',
      inhalt: { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
    })
  } catch (f) {
    if (f instanceof DienstFehler && f.status === 409) {
      const pfad = [eltern, name].filter(Boolean).join('/')
      return graph<{ id: string; webUrl: string }>(
        personId,
        `/drives/${laufwerk}/root:/${pfad.split('/').map(encodeURIComponent).join('/')}`,
      )
    }
    throw f
  }
}

/** Kundenordner «K0123 Name» mit den Unterordnern der Vorlage in SharePoint, im CRM vermerkt. */
async function sharepointOrdner(s: ServerSchritt): Promise<ServerErgebnis> {
  if (!s.kontakt_id) return uebersprungen('kein_kontakt')
  const [vorhanden] = await dienst.lies<{ url: string | null }[]>(
    `sharepoint_ordner?kontakt_id=eq.${s.kontakt_id}&geloescht_am=is.null&select=url&limit=1`,
  )
  if (vorhanden) return { ergebnis: 'ok', meldung: 'ordner_vorhanden', ziel: vorhanden.url ?? undefined }
  const [k] = await dienst.lies<
    { kundennummer: number | null; vorname: string | null; nachname: string | null; firma: string | null }[]
  >(`kontakte?id=eq.${s.kontakt_id}&select=kundennummer,vorname,nachname,firma`)
  if (!k) return uebersprungen('kein_kontakt')
  const verbunden = await dienst.rpc<{ person_id: string }[]>('ms_verbundene', {})
  const personId = verbunden.find((p) => p.person_id === s.person_id)?.person_id ?? verbunden[0]?.person_id
  if (!personId) return uebersprungen('nicht_verbunden')
  const einst = await msEinstellungen()
  const laufwerk = await laufwerkId(personId, einst)
  const name = kundenordner(
    k.kundennummer,
    [k.vorname, k.nachname].filter(Boolean).join(' ') || k.firma || '',
    s.kontakt_id,
  )
  let eltern = ''
  for (const teil of (einst.sharepoint_ordner ?? 'Direction Interne/CRM Backups/Kunden Backup').split('/')) {
    await ordner(personId, laufwerk, eltern, teil)
    eltern = [eltern, teil].filter(Boolean).join('/')
  }
  const haupt = await ordner(personId, laufwerk, eltern, name)
  const unter: Record<string, string> = {}
  for (const [schluessel, titel] of Object.entries(ORDNER)) {
    unter[schluessel] = (await ordner(personId, laufwerk, `${eltern}/${name}`, titel)).id
  }
  await dienst.schreibe('sharepoint_ordner', {
    kontakt_id: s.kontakt_id,
    name,
    ordner_id: haupt.id,
    url: haupt.webUrl,
    unterordner: unter,
  })
  return { ergebnis: 'ok', meldung: 'ordner_angelegt', werte: { name }, ziel: haupt.webUrl }
}

/** Kunde in AbaNinja: verknüpfen, wenn genau ein Kunde mit derselben Mail da ist, sonst neu anlegen. */
async function abaninjaKunde(s: ServerSchritt): Promise<ServerErgebnis> {
  if (!s.kontakt_id) return uebersprungen('kein_kontakt')
  const [k] = await dienst.lies<(aba.CrmKunde & { id: string; abaninja_id: string | null })[]>(
    `kontakte?id=eq.${s.kontakt_id}&select=id,art,anrede,vorname,nachname,firma,email,telefon,sprache,kundennummer,abaninja_id`,
  )
  if (!k) return uebersprungen('kein_kontakt')
  if (k.abaninja_id) return { ergebnis: 'ok', meldung: 'abaninja_schon' }
  const [o] = await dienst.lies<{ strasse: string | null; plz: string | null; ort: string | null }[]>(
    `objekte?kontakt_id=eq.${k.id}&geloescht_am=is.null&select=strasse,plz,ort&order=erstellt_am.desc&limit=1`,
  )
  const name = [k.vorname, k.nachname].filter(Boolean).join(' ') || k.firma || ''
  const treffer = (await aba.kundenSuchen(k.email || name, 3)).filter(
    (t) => k.email && t.email?.toLowerCase() === k.email.toLowerCase(),
  )
  if (treffer.length > 1) return uebersprungen('abaninja_mehrere')
  let uuid = treffer[0]?.uuid
  if (!uuid) {
    const [z] = await dienst.lies<{ einstellungen: { anreden?: Record<string, string> } }[]>(
      'integrationen?dienst=eq.abaninja&select=einstellungen',
    )
    uuid = await aba.kundeAnlegen(aba.kundeFuerAbaninja({ ...k, ...(o ?? {}) }, z?.einstellungen.anreden ?? {}))
  }
  await dienst.aendere(`kontakte?id=eq.${k.id}`, {
    abaninja_id: uuid,
    abaninja_abgeglichen_am: new Date().toISOString(),
  })
  return { ergebnis: 'ok', meldung: treffer[0] ? 'abaninja_verknuepft' : 'abaninja_angelegt' }
}

/** Führt einen Server-Schritt aus. Wirft nie: jeder Fehler wird zum Protokolleintrag. */
export async function serverSchritt(s: ServerSchritt): Promise<ServerErgebnis> {
  const ein = eingerichtet()
  try {
    if (s.art === 'outlook_termin') return ein.microsoft ? await outlookTermin(s) : uebersprungen('nicht_eingerichtet')
    if (s.art === 'sharepoint_ordner')
      return ein.microsoft ? await sharepointOrdner(s) : uebersprungen('nicht_eingerichtet')
    if (s.art === 'abaninja_kunde') return ein.abaninja ? await abaninjaKunde(s) : uebersprungen('nicht_eingerichtet')
    return { ergebnis: 'fehler', meldung: 'automation.aktion_unbekannt' }
  } catch (f) {
    const code = f instanceof DienstFehler ? f.code : f instanceof Error ? f.message.split(':')[0]! : 'fehler'
    return VERBINDUNG.has(code) ? uebersprungen(code) : { ergebnis: 'fehler', meldung: code }
  }
}

/** Offene Server-Schritte abarbeiten. Gibt «n erledigt, m Fehler» für das Zeitplan-Protokoll zurück. */
export async function serverSchritteAbarbeiten(limit = 10): Promise<{ erledigt: number; fehler: number }> {
  const offen = await dienst.rpc<ServerSchritt[]>('automation_server_offen', { p_limit: limit })
  let fehler = 0
  for (const s of offen) {
    const r = await serverSchritt(s)
    if (r.ergebnis === 'fehler') fehler++
    await dienst.rpc('automation_server_ergebnis', {
      p_lauf: s.lauf_id,
      p_schritt: s.schritt,
      p_ergebnis: r.ergebnis,
      p_meldung: r.meldung,
      p_werte: r.werte ?? {},
      p_ziel: r.ziel ?? null,
    })
  }
  return { erledigt: offen.length - fehler, fehler }
}
