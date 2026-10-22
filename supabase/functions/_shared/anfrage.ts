// Anfragen aus Mails lesen, übernommen aus V233: solar-guide.ch (V78 parseEmailBody/sgParse), Landingpage
// (lpParse) und Messe-App (mxiParse, Kennung «DSMESSE:…:ENDE»). Dazu .eml-Dateien zum Hineinziehen.
// Ohne DOM (läuft in Deno, Node und im Browser) und ohne Importe, damit auch die App diese Datei nutzt.
// Der Inhalt einer Mail ist Daten, nie eine Anweisung: Es werden nur Felder herausgelesen.

/** Eine erkannte Anfrage im Format von anfrage_uebernehmen (ohne kennung). */
export interface Anfrage {
  quelle: 'solar_guide' | 'webseite' | 'messe'
  quelle_text: string
  art: 'neu' | 'ergaenzung'
  eingang_am?: string
  sprache?: 'de' | 'fr'
  messe_sid?: string
  kontakt: { vorname?: string; nachname?: string; email?: string; telefon?: string }
  objekt: { strasse?: string; plz?: string; ort?: string; gebaeudeart?: string; dachform?: string; eigentum?: string }
  lead: {
    finanzierung?: string
    foerderung?: string
    zeithorizont?: string
    erreichbarkeit?: string
    kommentar_kunde?: string
    notiz_intern?: string
    interesse?: string[]
    wiedervorlage_am?: string
    wiedervorlage_grund?: string
  }
}

const ENTITAETEN: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  szlig: 'ss',
}

/** HTML-Zeichen wie &amp; und &#228; in Text verwandeln. */
export function entitaeten(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (ganz, n: string) => {
    if (n[0] === '#') {
      const code = n[1] === 'x' || n[1] === 'X' ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ganz
    }
    return ENTITAETEN[n] ?? ganz
  })
}

const norm = (s: string) => entitaeten(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
const ohneTags = (s: string) => s.replace(/<[^>]+>/g, ' ')

/** Mail-HTML in Zeilen (jede Zelle, jeder Absatz eine Zeile), wie V233 sgLines. Text bleibt Text. */
export function zeilen(inhalt: string): string[] {
  const html = /<[a-z][\s\S]*>/i.test(inhalt)
  const text = html
    ? inhalt
        .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(td|th|p|div|tr|li|h[1-6]|table)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    : inhalt
  return text
    .split(/\r\n|\r|\n/)
    .map((z) => norm(z))
    .filter(Boolean)
}

// --- solar-guide.ch ---------------------------------------------------------------------------------------

/** Absender und Betreff der solar-guide-Mails (V78). */
export const SOLAR_GUIDE = { absender: 'anfrage@solar-guide.ch', betreff: /solar-?guide\.ch:\s*Anfrage von/i }

// Fragen im Formular von solar-guide.ch → Feld. Auswahltexte werden in der Datenbank zugeordnet.
const SG_FELDER: [string, string][] = [
  ['Wo soll die Photovoltaikanlage installiert werden?', 'objekt.gebaeudeart'],
  ['Welche Dachform hat das Gebäude?', 'objekt.dachform'],
  ['Sind Sie Eigentümer der Liegenschaft?', 'objekt.eigentum'],
  ['Welches Finanzierungsmodell kommt für Sie in Frage?', 'lead.finanzierung'],
  ['Sind Sie an einer Förderung durch Bund oder Kanton interessiert?', 'lead.foerderung'],
  ['Wann soll die Photovoltaik-Anlage installiert werden?', 'lead.zeithorizont'],
  ['Strasse und Hausnummer', 'objekt.strasse'],
  ['PLZ', 'objekt.plz'],
  ['Ort', 'objekt.ort'],
  ['Vorname', 'kontakt.vorname'],
  ['Nachname', 'kontakt.nachname'],
  ['E-Mail-Adresse', 'kontakt.email'],
  ['Ihre Telefonnummer', 'kontakt.telefon'],
  ['Erreichbarkeit', 'lead.erreichbarkeit'],
  ['Kommentar', 'lead.kommentar_kunde'],
]

/** Name «Anna Muster» in Vor- und Nachname (letztes Wort = Nachname, wie V233 splitName). */
export function nameTeilen(name: string): { vorname?: string; nachname?: string } {
  const teile = name.trim().split(/\s+/).filter(Boolean)
  if (!teile.length) return {}
  if (teile.length === 1) return { nachname: teile[0]! }
  return { vorname: teile.slice(0, -1).join(' '), nachname: teile.at(-1)! }
}

function setze(a: Anfrage, pfad: string, wert: string) {
  const [teil, feld] = pfad.split('.') as ['kontakt' | 'objekt' | 'lead', string]
  ;(a[teil] as Record<string, string>)[feld] = wert
}

/** solar-guide.ch-Anfrage lesen (HTML oder Text). null, wenn es keine ist. */
export function solarGuideLesen(inhalt: string, betreff: string): Anfrage | null {
  const z = zeilen(inhalt)
  const a: Anfrage = {
    quelle: 'solar_guide',
    quelle_text: 'solar-guide.ch',
    art: 'neu',
    kontakt: {},
    objekt: {},
    lead: {},
  }
  let treffer = 0
  let erste = -1
  for (const [frage, pfad] of SG_FELDER) {
    const i = z.indexOf(frage)
    if (i === -1 || i + 1 >= z.length) continue
    treffer++
    if (erste === -1 || i < erste) erste = i
    let wert = z[i + 1]!
    if (pfad === 'kontakt.email') wert = wert.replace(/\s*<mailto:[^>]*>\s*/i, '').trim()
    if (pfad === 'lead.kommentar_kunde' && wert === '-') wert = ''
    if (wert) setze(a, pfad, wert)
  }
  // Betreff «solar-guide.ch: Anfrage von <Name> in <PLZ> <Ort>» als Ersatz
  const b = /Anfrage von (.+?) in (\d{4})\s+(.+)$/.exec(betreff.replace(/^((WG|FW|Fwd|AW|RE|TR)\s*:\s*)+/i, '').trim())
  if (b) {
    if (!a.kontakt.vorname && !a.kontakt.nachname) Object.assign(a.kontakt, nameTeilen(b[1]!))
    a.objekt.plz ??= b[2]!
    a.objekt.ort ??= b[3]!.trim()
  }
  if (treffer < 4 && !b) return null
  if (treffer < 4) {
    a.kontakt.email ??= /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.exec(z.join('\n'))?.[0]
    a.kontakt.telefon ??= /(\+41|0)[\d\s/-]{8,}\d/.exec(z.join('\n'))?.[0]?.trim()
  }
  // Notiz der weiterleitenden Person (vor der ersten Frage), ohne die Kopfzeilen der Weiterleitung
  const vorspann = (erste > 0 ? z.slice(0, erste) : [])
    .filter((l) => !/^(Von|From|Gesendet|Sent|An|To|Cc|Betreff|Subject)\s*:/i.test(l))
    .join('\n')
    .trim()
  if (vorspann) a.lead.notiz_intern = vorspann
  return aufraeumen(a)
}

// --- Landingpage ------------------------------------------------------------------------------------------

const KANTONE = /\s+(AG|BE|FR|LU|ZH|ZG|SO|BL|BS|VD|NE|JU|VS|GE|SZ|TG|SG|AR|AI|GL|NW|OW|UR|SH|TI|GR)$/

/** Paare «Bezeichnung → Wert» aus Tabellenzeilen mit zwei Zellen und fetten Überschriften (lpParse). */
function paare(html: string): [string, string][] {
  const out: [string, string][] = []
  for (const [, zeile] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    if (/<table/i.test(zeile!)) continue
    const zellen = [...zeile!.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => norm(ohneTags(m[1]!)))
    if (zellen.length !== 2) continue
    const [l, v] = [zellen[0]!, zellen[1]!.replace(/\s*Karte$/, '')]
    if (l && v && l.length < 60) out.push([l, v])
  }
  const fett = /<div[^>]*style="[^"]*font-weight:\s*bold[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/gi
  for (const m of html.matchAll(fett)) {
    const l = norm(ohneTags(m[1]!)).replace(/^[^A-Za-zÄÖÜäöüÉéÈèÀàÇç]+/, '')
    const v = norm(ohneTags(m[2]!))
    if (l && v) out.push([l, v])
  }
  return out
}

const schluessel = (l: string) =>
  norm(l)
    .toLowerCase()
    .replace(/[^a-zäöüéèàç ]/g, '')
    .trim()

/** Eigentum aus der Landingpage (V233 lpEigen) als Text für die Auswahlliste. */
function eigentum(v: string): string {
  const w = v.toLowerCase()
  if (!w) return ''
  if (/mit|stweg|co-/.test(w)) return 'Miteigentum'
  if (/mieter|locataire/.test(w)) return 'Mieter:in'
  if (/eigent|propri/.test(w)) return 'Eigentümer'
  return v
}

/** Anfrage von der eigenen Landingpage («Leads Landingpage»). null, wenn nichts Brauchbares drinsteht. */
export function landingpageLesen(html: string, betreff: string): Anfrage | null {
  const text = norm(ohneTags(html))
  const r: Record<string, string> = {}
  const details: string[] = []
  const h1 = /<[^>]+class="[^"]*\bh1\b[^"]*"[^>]*>([\s\S]*?)<\/[a-z0-9]+>/i.exec(html)
  r.name = h1 ? norm(ohneTags(h1[1]!)) : ''
  for (const [l, v] of paare(html)) {
    const k = schluessel(l)
    if (/^(telefon|téléphone|telephone|tel|phone)/.test(k)) r.tel ||= v
    else if (/^(email|e mail|courriel|mail)/.test(k.replace('-', ' '))) r.mail ||= v
    else if (/^(adresse|address)/.test(k)) {
      const a = /^(.*?),\s*(\d{4})\s+(.+)$/.exec(v)
      if (a) Object.assign(r, { strasse: a[1], plz: a[2], ort: a[3]!.replace(KANTONE, '') })
      else r.strasse = v
    } else if (/^(strasse|rue)/.test(k)) r.strasse = v
    else if (/^(plz|npa)/.test(k)) r.plz = v
    else if (/^(ort|localité|localite|lieu)/.test(k)) r.ort = v
    else if (/^(vorname|prénom|prenom)/.test(k)) r.vorname = v
    else if (/^(nachname|nom)$/.test(k)) r.nachname = v
    else if (/^(name)$/.test(k)) r.name ||= v
    else if (/^(interesse|intérêt|interet)/.test(k)) r.interesse = v
    else if (/^(eigentum|propriété|propriete)/.test(k)) r.eigentum = v
    else if (/^(bezug zu anfrage|référence|reference)/.test(k)) r.bezug = v
    else if (!/^(quelle|kampagne|sprache|visitor|zuständig|zustandig|responsable)/.test(k)) details.push(`${l}: ${v}`)
  }
  if (r.bezug) {
    const teile = r.bezug.split('·').map((x) => x.trim())
    r.name ||= teile[0] ?? ''
    r.tel ||= teile.find((x) => /\d{3}.*\d{2}/.test(x) && !x.includes('@')) ?? ''
    r.mail ||= teile.find((x) => x.includes('@')) ?? ''
  }
  if (!r.name && !r.vorname && !r.nachname && !r.tel && !r.mail) return null
  const datum =
    /(\d{2})\.(\d{2})\.(\d{4}),?\s+(\d{1,2}:\d{2})/.exec(betreff) ??
    /(\d{2})\.(\d{2})\.(\d{4}),?\s+(\d{1,2}:\d{2})/.exec(text)
  const fr =
    /Sprache:\s*Fran|Langue\s*:\s*Fran/i.test(text) ||
    /Nouvelle demande|Complément/i.test(text) ||
    paare(html).some(([l]) => /^(Prénom|Nom|Téléphone|NPA|Localité|Intérêt|Propriété|Rue)\b/i.test(norm(l)))
  const name =
    r.vorname || r.nachname ? { vorname: r.vorname, nachname: r.nachname } : nameTeilen(r.name || r.mail || r.tel || '')
  return aufraeumen({
    quelle: 'webseite',
    quelle_text: 'Landingpage',
    art:
      /ERG[ÄA]NZUNG|COMPL[ÉE]MENT/i.test(betreff) ||
      /Ergänzung zur Anfrage|Complément à la demande|Bezug zu Anfrage|Référence à la demande/i.test(text)
        ? 'ergaenzung'
        : 'neu',
    ...(datum ? { eingang_am: `${datum[3]}-${datum[2]}-${datum[1]}` } : {}),
    sprache: fr ? 'fr' : 'de',
    kontakt: { ...name, email: r.mail, telefon: r.tel },
    objekt: { strasse: r.strasse, plz: r.plz, ort: r.ort, eigentum: eigentum(r.eigentum ?? '') },
    lead: { kommentar_kunde: [r.interesse ? `Interesse: ${r.interesse}` : '', ...details].filter(Boolean).join('\n') },
  })
}

// --- Messe-App --------------------------------------------------------------------------------------------

/** Base64 → Text (UTF-8). */
function ausBase64(b: string): string {
  const roh = atob(b.replace(/\s+/g, ''))
  return new TextDecoder().decode(Uint8Array.from(roh, (c) => c.charCodeAt(0)))
}

/** Daten der Messe-App aus einer Mail («DSMESSE:<base64>:ENDE»). */
export interface MesseEintrag {
  sid: string
  nr?: string
  event?: string
  typ?: string
  kanal?: string
  by?: string
  at?: string
  sprache?: string
  vorname?: string
  nachname?: string
  street?: string
  plz?: string
  ort?: string
  tel?: string
  mail?: string
  int?: string[]
  wish?: string[]
  wohn?: string
  dach?: string
  obj?: string
  eigen?: string
  zeit?: string
  reach?: string
  note?: string
  messerabatt?: string | number
  termin?: { datum?: string; zeit?: string; spaeter?: boolean; wann?: string }
}

/** Liest «DSMESSE:…:ENDE» (neuer Eintrag) oder «DSMESSE-DEL:…:ENDE» (gelöschte Einträge). */
export function messeLesen(inhalt: string): { neu?: MesseEintrag; geloescht?: string[] } | null {
  const text = norm(ohneTags(inhalt))
  const del = /DSMESSE-DEL:([A-Za-z0-9+/=\s]+?):ENDE/.exec(text)
  try {
    if (del) {
      const d = JSON.parse(ausBase64(del[1]!)) as { sids?: unknown }
      return Array.isArray(d.sids) ? { geloescht: d.sids.map(String) } : null
    }
    const m = /DSMESSE:([A-Za-z0-9+/=\s]+?):ENDE/.exec(text)
    if (!m) return null
    const d = JSON.parse(ausBase64(m[1]!)) as MesseEintrag
    return d?.sid ? { neu: d } : null
  } catch {
    return null
  }
}

const INTERESSE: Record<string, [string, string]> = {
  pv: ['pv', 'Photovoltaik'],
  bat: ['batterie', 'Batteriespeicher'],
  wp: ['waermepumpe', 'Wärmepumpe'],
  ev: ['wallbox', 'Ladestation'],
}
const WUNSCH: Record<string, string> = {
  call: 'Rückruf',
  visit: 'Besichtigung vor Ort',
  mail: 'Richtofferte per E-Mail',
}
const WOHNEN: Record<string, string> = {
  haus: 'Eigentum Haus',
  whg: 'Eigentum Wohnung',
  miete: 'Miete',
  firma: 'Firma / Landwirtschaft',
}

/** Nächster Werktag nach einem Datum (für die Wiedervorlage, V233 mxiNextWorkday). */
export function naechsterWerktag(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  do d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
  return d.toISOString().slice(0, 10)
}

const datumCh = (iso: string) => iso.slice(0, 10).split('-').reverse().join('.')

/** Messe-Eintrag → Anfrage (V233 mxiBody). */
export function messeZuAnfrage(d: MesseEintrag): Anfrage {
  const wettbewerb = d.typ === 'wettbewerb'
  const art = wettbewerb ? 'Wettbewerb (wünscht Beratung)' : 'Beratungsanfrage'
  const z = [
    `[${wettbewerb ? 'MESSE · WETTBEWERB + BERATUNG' : 'MESSE · BERATUNGSANFRAGE'}]`,
    `${d.event ?? ''} – ${art} (${d.kanal === 'scan' ? 'Papierformular' : 'iPad'}, erfasst von ${d.by || '–'}, Nr. ${d.nr ?? ''})`,
  ]
  if (d.int?.length) z.push(`Interesse: ${d.int.map((k) => INTERESSE[k]?.[1] ?? k).join(', ')}`)
  if (d.wish?.length) z.push(`Wunsch: ${d.wish.map((k) => WUNSCH[k] ?? k).join(', ')}`)
  if (d.termin?.spaeter)
    z.push(
      `Terminwunsch Besichtigung: zu einem späteren Zeitpunkt${d.termin.wann ? ` – ${d.termin.wann}` : ''} (bitte nachfassen)`,
    )
  if (d.termin?.datum)
    z.push(
      `Terminwunsch Besichtigung: ${datumCh(d.termin.datum)}${d.termin.zeit ? `, ${d.termin.zeit} Uhr` : ''} (bitte bestätigen)`,
    )
  if (d.wohn) z.push(`Wohnsituation: ${WOHNEN[d.wohn] ?? d.wohn}`)
  if (d.dach) z.push(`Dachart (Angabe Kunde): ${d.dach}`)
  if (d.messerabatt)
    z.push(`MESSERABATT: CHF ${d.messerabatt}.– bei Abschluss der Anlage zugesagt (Wettbewerb + Beratungswunsch)`)
  if (d.note) z.push(d.note)
  const eingang = (d.at ?? '').slice(0, 10)
  const wv = d.termin?.datum || d.termin?.spaeter ? naechsterWerktag(eingang || new Date().toISOString()) : ''
  return aufraeumen({
    quelle: 'messe',
    quelle_text: `Messe ${d.event ?? ''}`.trim(),
    art: 'neu',
    ...(eingang ? { eingang_am: eingang } : {}),
    sprache: d.sprache === 'Deutsch' ? 'de' : 'fr',
    messe_sid: d.sid,
    kontakt: { vorname: d.vorname, nachname: d.nachname, email: d.mail, telefon: d.tel },
    objekt: {
      strasse: d.street,
      plz: d.plz,
      ort: d.ort,
      gebaeudeart: d.obj || (d.wohn === 'haus' ? 'Einfamilienhaus' : d.wohn === 'firma' ? 'Gewerbe' : ''),
      dachform: /flach/i.test(d.dach ?? '') ? 'Flachdach' : '',
      eigentum:
        d.eigen || (d.wohn === 'haus' || d.wohn === 'whg' ? 'Eigentümer' : d.wohn === 'miete' ? 'Mieter:in' : ''),
    },
    lead: {
      zeithorizont: d.zeit,
      erreichbarkeit: d.reach,
      kommentar_kunde: z.join('\n'),
      interesse: (d.int ?? []).map((k) => INTERESSE[k]?.[0]).filter((k): k is string => Boolean(k)),
      wiedervorlage_am: wv,
      wiedervorlage_grund: d.termin?.datum
        ? `Terminwunsch bestätigen: ${datumCh(d.termin.datum)}${d.termin.zeit ? `, ${d.termin.zeit} Uhr` : ''}`
        : d.termin?.spaeter
          ? `Terminwunsch «später» nachfassen${d.termin.wann ? ` (${d.termin.wann})` : ''}`
          : '',
    },
  })
}

// --- .eml-Dateien (Lead-Import per Hineinziehen, V233 parseEmlText) --------------------------------------

function quotedPrintable(s: string): string {
  const bytes: number[] = []
  const roh = s.replace(/=\r?\n/g, '')
  for (let i = 0; i < roh.length; i++) {
    const h = roh.slice(i + 1, i + 3)
    if (roh[i] === '=' && /^[0-9A-F]{2}$/i.test(h)) {
      bytes.push(parseInt(h, 16))
      i += 2
    } else bytes.push(roh.charCodeAt(i) & 0xff)
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

/** Betreff-Kopf mit «=?utf-8?Q?…?=» oder «=?utf-8?B?…?=» lesbar machen. */
function kopfText(s: string): string {
  return s.replace(/=\?[^?]+\?([QB])\?([^?]*)\?=/gi, (_, art: string, t: string) =>
    art.toUpperCase() === 'B' ? ausBase64(t) : quotedPrintable(t.replace(/_/g, ' ')),
  )
}

/** .eml-Text → Betreff, Absender und Inhalt (Text bevorzugt, sonst HTML). */
export function emlLesen(roh: string): { betreff: string; von: string; inhalt: string } {
  const [kopf = '', ...rest] = roh.split(/\r?\n\r?\n/)
  const koepfe = kopf.replace(/\r?\n[ \t]+/g, ' ')
  const feld = (n: string) => kopfText(new RegExp(`^${n}:\\s*(.+)$`, 'im').exec(koepfe)?.[1]?.trim() ?? '')
  const koerper = rest.join('\n\n')
  const grenze = /boundary="?([^"\r\n;]+)"?/i.exec(koepfe) ?? /boundary="?([^"\r\n;]+)"?/i.exec(koerper)
  let text: string | null = null
  let html: string | null = null
  const teile = grenze ? koerper.split(`--${grenze[1]}`) : [`${koepfe}\n\n${koerper}`]
  for (const teil of teile) {
    const [h = '', ...b] = teil.split(/\r?\n\r?\n/)
    let inhalt = b.join('\n\n')
    if (/content-transfer-encoding:\s*quoted-printable/i.test(h)) inhalt = quotedPrintable(inhalt)
    else if (/content-transfer-encoding:\s*base64/i.test(h)) {
      try {
        inhalt = ausBase64(inhalt)
      } catch {
        /* kaputter Teil: so lassen */
      }
    }
    if (/content-type:\s*text\/html/i.test(h)) html ??= inhalt
    else if (/content-type:\s*text\/plain/i.test(h) || !grenze) text ??= inhalt
  }
  return { betreff: feld('Subject'), von: feld('From'), inhalt: text ?? html ?? koerper }
}

/** Welche Art Anfrage ist diese Mail? Versucht Messe, solar-guide und Landingpage. */
export function anfrageErkennen(inhalt: string, betreff: string, von = ''): Anfrage | null {
  const messe = messeLesen(inhalt)
  if (messe?.neu) return messeZuAnfrage(messe.neu)
  if (SOLAR_GUIDE.betreff.test(betreff) || von.toLowerCase().includes(SOLAR_GUIDE.absender)) {
    return solarGuideLesen(inhalt, betreff)
  }
  if (/Leads Landingpage/i.test(betreff) || /<tr/i.test(inhalt)) return landingpageLesen(inhalt, betreff)
  return solarGuideLesen(inhalt, betreff)
}

/** Leere Felder entfernen, damit die Datenbank nur Werte bekommt. */
function aufraeumen(a: Anfrage): Anfrage {
  const sauber = <T extends object>(o: T): T =>
    Object.fromEntries(
      Object.entries(o).filter(([, v]) =>
        Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '',
      ),
    ) as T
  return { ...a, kontakt: sauber(a.kontakt), objekt: sauber(a.objekt), lead: sauber(a.lead) }
}
