// Beratungstermin eines Leads in Outlook eintragen, ändern oder absagen (V233 «In Outlook eintragen»).
// Der Termin steht im Kalender der Person, die den Knopf drückt (Organisator). Eingeladen werden die
// Person, die den Termin wahrnimmt, und auf Wunsch der Kunde: Dann verschickt Outlook die Einladung –
// das ist der Versand nach aussen, den ein Mensch mit dem Knopf freigibt (Regel 6).

import { dienst, type Ich } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { graph } from './microsoft.ts'
import { adressen, terminZuOutlook, textZuHtml, type Adresse } from './outlook.ts'

/** Was die App mitschickt. */
export interface TerminEingabe {
  verkaufschance_id: string
  betreff?: string
  text?: string
  kunde_einladen?: boolean
}

interface Geschaeft {
  verkaufschance_id: string
  name: string
  email: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  termin_am: string | null
  termin_dauer_min: number | null
  termin_person_id: string | null
}

/** Was am Lead über den Outlook-Termin gespeichert wird (wie V233: olEventId, olEventLink …). */
export interface OutlookVermerk {
  olEventId: string
  olEventLink: string
  olOrganizer: string
  olLocation: string
  olAttendees: string[]
  olInvite: boolean
}

async function geschaeft(id: string): Promise<{ g: Geschaeft; outlook: Partial<OutlookVermerk> }> {
  const [g] = await dienst.lies<Geschaeft[]>(
    `verkauf_geschaefte?verkaufschance_id=eq.${encodeURIComponent(id)}&select=verkaufschance_id,name,email,strasse,plz,ort,termin_am,termin_dauer_min,termin_person_id&limit=1`,
  )
  const [v] = await dienst.lies<{ outlook: Partial<OutlookVermerk> | null }[]>(
    `verkaufschancen?id=eq.${encodeURIComponent(id)}&select=outlook`,
  )
  if (!g) throw new DienstFehler('nicht_gefunden', 404, 'Lead')
  return { g, outlook: v?.outlook ?? {} }
}

/** Ort wie V233: «Strasse, PLZ Ort». */
export function terminOrt(g: Pick<Geschaeft, 'strasse' | 'plz' | 'ort'>): string {
  return [g.strasse, [g.plz, g.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

/** Termin eintragen oder (wenn schon da und von mir) ändern. Gibt den Vermerk zurück. */
export async function terminEintragen(ich: Ich, e: TerminEingabe): Promise<OutlookVermerk> {
  const { g, outlook } = await geschaeft(e.verkaufschance_id)
  if (!g.termin_am) throw new DienstFehler('kein_termin', 400, 'Kein Termin')
  if (outlook.olEventId && outlook.olOrganizer && outlook.olOrganizer.toLowerCase() !== ich.email.toLowerCase()) {
    throw new DienstFehler('fremder_termin', 409, 'Termin gehört jemand anderem')
  }
  const teilnehmer: Adresse[] = []
  if (g.termin_person_id && g.termin_person_id !== ich.id) {
    const [p] = await dienst.lies<{ email: string; name: string }[]>(
      `personen?id=eq.${g.termin_person_id}&select=email,name`,
    )
    if (p?.email) teilnehmer.push({ email: p.email, name: p.name })
  }
  const kunde = e.kunde_einladen ? adressen(g.email)[0] : undefined
  if (e.kunde_einladen && !kunde) throw new DienstFehler('ausgang.adresse_ungueltig', 400, 'Kunde ohne Mail')
  if (kunde) teilnehmer.push({ email: kunde, name: g.name })
  const ort = terminOrt(g)
  const termin = terminZuOutlook({
    betreff: e.betreff?.trim() || `PV-Anlage: Vor-Ort-Termin – ${g.name || ort}`,
    html: textZuHtml(e.text ?? ''),
    beginn: g.termin_am,
    dauerMin: g.termin_dauer_min ?? 90,
    ort,
    teilnehmer,
  })
  const r = outlook.olEventId
    ? await graph<{ id: string; webLink: string }>(ich.id, `/me/events/${encodeURIComponent(outlook.olEventId)}`, {
        methode: 'PATCH',
        inhalt: termin,
      })
    : await graph<{ id: string; webLink: string }>(ich.id, '/me/events', { methode: 'POST', inhalt: termin })
  const vermerk: OutlookVermerk = {
    olEventId: r.id,
    olEventLink: r.webLink,
    olOrganizer: ich.email,
    olLocation: ort,
    olAttendees: teilnehmer.map((t) => t.email),
    olInvite: Boolean(kunde),
  }
  await dienst.aendere(`verkaufschancen?id=eq.${encodeURIComponent(g.verkaufschance_id)}`, { outlook: vermerk })
  await dienst.rpc('termin_vermerken', {
    p_verkaufschance: g.verkaufschance_id,
    p_person: ich.id,
    p_text: `${outlook.olEventId ? 'Outlook-Termin geändert' : 'In Outlook eingetragen'}${kunde ? ` – Einladung an ${kunde}` : ''}`,
  })
  return vermerk
}

/** Termin in Outlook absagen (Outlook benachrichtigt die Eingeladenen). */
export async function terminAbsagen(ich: Ich, verkaufschanceId: string): Promise<void> {
  const { outlook } = await geschaeft(verkaufschanceId)
  if (!outlook.olEventId) return
  if (outlook.olOrganizer && outlook.olOrganizer.toLowerCase() !== ich.email.toLowerCase()) {
    throw new DienstFehler('fremder_termin', 409, 'Termin gehört jemand anderem')
  }
  try {
    await graph(ich.id, `/me/events/${encodeURIComponent(outlook.olEventId)}/cancel`, {
      methode: 'POST',
      inhalt: { comment: '' },
    })
  } catch (f) {
    // Ohne Eingeladene gibt es nichts abzusagen: dann einfach löschen. Schon weg ist auch gut.
    if (!(f instanceof DienstFehler)) throw f
    if (f.code !== 'nicht_gefunden') {
      await graph(ich.id, `/me/events/${encodeURIComponent(outlook.olEventId)}`, { methode: 'DELETE' }).catch((g) => {
        if (!(g instanceof DienstFehler && g.code === 'nicht_gefunden')) throw g
      })
    }
  }
  await dienst.aendere(`verkaufschancen?id=eq.${encodeURIComponent(verkaufschanceId)}`, { outlook: null })
  await dienst.rpc('termin_vermerken', {
    p_verkaufschance: verkaufschanceId,
    p_person: ich.id,
    p_text: 'Outlook-Termin abgesagt',
  })
}
