// Anfrage aus einem Formular der Website (dimension-solaire.ch, DE und FR) in das Format von «lead_aus_website».
// Die Website prüft die Felder schon (validateLead) und schickt sie nach dem Speichern von Server zu Server
// (Vertrag: docs/website-anfrage.md). Der Inhalt ist Daten, nie Anweisung (Regel 7): hier wird nur zugeordnet,
// gekürzt und geprüft. Ohne Importe, damit Deno und die Tests (Vitest) dieselbe Datei nutzen.

/** Formulare, aus denen ein Lead wird. «kontakt» nur mit Rückrufwunsch, «report-email» nur mit Kontaktwunsch. */
export const LEAD_FORMULARE = ['offerte', 'rueckruf', 'kontakt', 'report-email'] as const
export type Formular = (typeof LEAD_FORMULARE)[number]

/** Was die Datenbank-Funktion lead_aus_website bekommt (anfrage_uebernehmen plus Herkunft und Dach). */
export interface WebLead {
  kennung: string
  quelle: 'webseite'
  quelle_text: string
  art: 'neu'
  eingang_am: string
  sprache: 'de' | 'fr'
  kontakt: { vorname?: string; nachname?: string; email?: string; telefon?: string }
  objekt: { strasse?: string; plz?: string; ort?: string; gebaeudeart?: string; eigentum?: string }
  lead: {
    interesse: string[]
    zeithorizont?: string
    finanzierung?: string
    erreichbarkeit?: string
    kommentar_kunde?: string
    notiz_intern?: string
  }
  herkunft: Record<string, string>
  dach: { flaeche_m2?: number; ertrag_kwh?: number; egid?: string }
  verbrauch_kwh?: number
}

export type WebPruefung =
  { art: 'ok'; lead: WebLead } | { art: 'kein_lead'; grund: string } | { art: 'fehler'; felder: string[] }

const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string' && typeof v !== 'number') return undefined
  const s = String(v).replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : undefined
}
const mehrzeilig = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined
  const s = v.replace(/\r\n?/g, '\n').trim()
  return s ? s.slice(0, max) : undefined
}
const zahl = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/['’\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}
const ja = (v: unknown) => v === true || ['true', 'on', 'ja', 'yes', '1', 'oui'].includes(String(v).toLowerCase())
const liste = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(String)
    : typeof v === 'string'
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

const INTERESSE: Record<string, string> = { pv: 'pv', speicher: 'batterie', wp: 'waermepumpe', ladestation: 'wallbox' }
const GEBAEUDE: Record<string, string> = {
  efh: 'einfamilienhaus',
  mfh: 'mehrfamilienhaus',
  gewerbe: 'gewerbe',
  landwirtschaft: 'landwirtschaft',
}
const ZEIT: Record<string, string> = { sofort: 'bis_3', '3m': 'bis_3', '6-12m': 'ueber_6', info: 'weiss_nicht' }
const SLOT: Record<string, string> = { vormittag: 'vormittag', nachmittag: 'nachmittag', abend: 'abends' }

const TITEL: Record<Formular, string> = {
  offerte: 'Offerten-Assistent',
  rueckruf: 'Rückruf',
  kontakt: 'Kontaktformular',
  'report-email': 'Rechner-Ergebnis per Mail',
}

/** «Lindenweg 7, 5612 Villmergen» oder «5612 Villmergen» in Strasse, PLZ und Ort. */
export function adresseTeilen(
  adresse: string | undefined,
  plz?: string,
): { strasse?: string; plz?: string; ort?: string } {
  if (!adresse) return plz ? { plz } : {}
  const m = /^(.*?)[,\s]+(\d{4})\s+(.+)$/.exec(adresse)
  if (m) return { ...(m[1]?.trim() ? { strasse: m[1].trim() } : {}), plz: m[2]!, ort: m[3]!.trim() }
  const nurOrt = /^(\d{4})\s+(.+)$/.exec(adresse)
  if (nurOrt) return { plz: nurOrt[1]!, ort: nurOrt[2]!.trim() }
  return { strasse: adresse, ...(plz ? { plz } : {}) }
}

/** «Sandra Huber» → Vorname Sandra, Nachname Huber (der letzte Teil ist der Nachname). */
export function nameTeilen(name: string | undefined): { vorname?: string; nachname?: string } {
  if (!name) return {}
  const teile = name.split(' ')
  if (teile.length === 1) return { nachname: teile[0]! }
  return { vorname: teile.slice(0, -1).join(' '), nachname: teile[teile.length - 1]! }
}

/**
 * Prüft und übersetzt eine Anfrage der Website. `id` ist die Referenz der Website (DS-…), sie wird zur Kennung
 * gegen doppelte Zustellung. Formulare ohne Verkaufsabsicht (Kontakt ohne Rückruf, Service) sind «kein_lead».
 */
export function webAnfrage(k: Record<string, unknown>): WebPruefung {
  const typ = String(k.type ?? '')
  const id = text(k.id, 60)
  const d = (k.data && typeof k.data === 'object' ? k.data : {}) as Record<string, unknown>
  if (!(LEAD_FORMULARE as readonly string[]).includes(typ)) return { art: 'kein_lead', grund: 'formular' }
  const f = typ as Formular
  if (f === 'kontakt' && !ja(d.callback)) return { art: 'kein_lead', grund: 'kein_rueckruf' }
  if (f === 'report-email' && !ja(d.followup)) return { art: 'kein_lead', grund: 'kein_kontaktwunsch' }

  const email = text(d.email, 200)?.toLowerCase()
  const telefon = text(d.telefon ?? d.phone, 40)
  const felder: string[] = []
  if (!id || !/^[\w-]{6,60}$/.test(id)) felder.push('id')
  if (!email && !telefon) felder.push('email')
  if (felder.length) return { art: 'fehler', felder }

  const name = text(d.name, 160)
  const kontakt = {
    ...(text(d.vorname, 80) || text(d.nachname, 80)
      ? {
          ...(text(d.vorname, 80) ? { vorname: text(d.vorname, 80)! } : {}),
          ...(text(d.nachname, 80) ? { nachname: text(d.nachname, 80)! } : {}),
        }
      : nameTeilen(name)),
    ...(email ? { email } : {}),
    ...(telefon ? { telefon } : {}),
  }
  const adresse = adresseTeilen(text(d.adresse ?? d.ort, 200), text(d.zip, 4))

  const roh = liste(d.interest)
  const interesse = [...new Set(roh.map((i) => INTERESSE[i]).filter((x): x is string => !!x))]
  const slots = liste(d.slots)
  const erreichbarkeit = slots.length === 3 ? 'ganztags' : slots.length === 1 ? SLOT[slots[0]!] : undefined

  const notiz = [
    `Formular: ${TITEL[f]}`,
    roh.some((i) => !INTERESSE[i]) ? `Weiteres Interesse: ${roh.filter((i) => !INTERESSE[i]).join(', ')}` : '',
    text(d.topic, 200) ? `Thema: ${text(d.topic, 200)}` : '',
    text(d.kontakt, 20) ? `Kontaktwunsch: ${text(d.kontakt, 20)}` : '',
    slots.length > 1 ? `Erreichbar: ${slots.join(', ')}` : '',
    zahl(d.verbrauch) ? `Verbrauch: ${zahl(d.verbrauch)} kWh/Jahr` : '',
    !zahl(d.verbrauch) && zahl(d.verbrauchGeschaetzt)
      ? `Verbrauch geschätzt: ${zahl(d.verbrauchGeschaetzt)} kWh/Jahr`
      : '',
    zahl(d.personen) ? `Personen im Haushalt: ${zahl(d.personen)}` : '',
    text(d.heizung, 20) ? `Heizung: ${text(d.heizung, 20)}` : '',
    text(d.eauto, 20) ? `Elektroauto: ${text(d.eauto, 20)}` : '',
    text(d.pv, 10) === 'ja'
      ? `Bestehende Solaranlage: ${[text(d.pvKwp, 10) && `${text(d.pvKwp, 10)} kWp`, text(d.pvJahr, 10)].filter(Boolean).join(', ') || 'ja'}`
      : '',
    text(d.budget, 20) ? `Budget: ${text(d.budget, 20)}` : '',
    text(d.gebaeude, 20) === 'neubau' ? 'Gebäude: Neubau' : '',
    text(d.tool, 40) ? `Rechner: ${text(d.tool, 40)}` : '',
    `Website-Referenz: ${id}`,
  ].filter(Boolean)

  const herkunft: Record<string, string> = { formular: f, website_id: id! }
  for (const [schluessel, feld, max] of [
    ['seite', 'page', 300],
    ['referrer', 'referrer', 300],
    ['utm_source', 'utm_source', 100],
    ['utm_medium', 'utm_medium', 100],
    ['utm_campaign', 'utm_campaign', 100],
    ['utm_term', 'utm_term', 100],
    ['utm_content', 'utm_content', 100],
    ['kontaktwunsch', 'kontakt', 20],
    ['standort', 'standort', 10],
    ['rechner', 'tool', 40],
  ] as const) {
    const w = text(d[feld], max)
    if (w) herkunft[schluessel] = w
  }

  const dach = {
    ...(zahl(d.roofArea) ? { flaeche_m2: zahl(d.roofArea)! } : {}),
    ...(zahl(d.roofKwh) ? { ertrag_kwh: zahl(d.roofKwh)! } : {}),
    ...(text(d.egid, 20) && /^\d+$/.test(text(d.egid, 20)!) ? { egid: text(d.egid, 20)! } : {}),
  }
  const eingang = text(k.receivedAt, 40)
  const lang = String(d.sprache ?? d.lang) === 'fr' ? 'fr' : 'de'
  const zeithorizont = ZEIT[String(d.zeitpunkt ?? '')]
  const gebaeudeart = GEBAEUDE[String(d.gebaeude ?? '')]
  const eigentum = d.eigentum === 'ja' ? 'eigentuemer' : d.eigentum === 'nein' ? 'mieter' : undefined
  const kommentar = mehrzeilig(d.message, 5000)
  const verbrauch = zahl(d.verbrauch) ?? zahl(d.verbrauchGeschaetzt)

  return {
    art: 'ok',
    lead: {
      kennung: `web:${id!}`,
      quelle: 'webseite',
      quelle_text: `Website (${TITEL[f]})`,
      art: 'neu',
      eingang_am:
        eingang && !Number.isNaN(Date.parse(eingang)) ? eingang.slice(0, 10) : new Date().toISOString().slice(0, 10),
      sprache: lang,
      kontakt,
      objekt: { ...adresse, ...(gebaeudeart ? { gebaeudeart } : {}), ...(eigentum ? { eigentum } : {}) },
      lead: {
        interesse,
        ...(zeithorizont ? { zeithorizont } : {}),
        ...(ja(d.finanzierung) ? { finanzierung: 'beides' } : {}),
        ...(erreichbarkeit ? { erreichbarkeit } : {}),
        ...(kommentar ? { kommentar_kunde: kommentar } : {}),
        notiz_intern: notiz.join('\n'),
      },
      herkunft,
      dach,
      ...(verbrauch ? { verbrauch_kwh: verbrauch } : {}),
    },
  }
}
