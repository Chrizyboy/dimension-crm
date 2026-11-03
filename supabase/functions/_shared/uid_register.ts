// UID-Register des Bundes (www.uid-wse.admin.ch, öffentlicher Dienst «PublicServices», ohne Schlüssel): Firmen
// zu einem Namen für «Neuer Eintrag» im Adressbuch. SOAP mit eCH-0097/0098-Feldern; die Antwort ist fremder Inhalt
// und wird nur als Text in Felder übernommen (CLAUDE.md Regel 7). Adresse über UID_URL ersetzbar (Ersatz-Server).

import { DienstFehler, rufe } from './http.ts'
import { env } from './umgebung.ts'

/** Eine Firma aus dem UID-Register, so wie das Adressbuch sie vorschlägt. */
export interface UidFirma {
  uid: string
  name: string
  rechtsform: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  /** false = im Register gelöscht oder inaktiv (wird angezeigt, aber gekennzeichnet). */
  aktiv: boolean
}

const STANDARD = 'https://www.uid-wse.admin.ch/V5.0/PublicServices.svc'
const AKTION = 'http://www.uid.admin.ch/xmlns/uid-wse/IPublicServices/Search'

// Rechtsformen nach eCH-0097 (nur die häufigen; sonst bleibt das Feld leer).
const RECHTSFORMEN: Record<string, string> = {
  '0101': 'Einzelunternehmen',
  '0103': 'Kollektivgesellschaft',
  '0104': 'Kommanditgesellschaft',
  '0106': 'AG',
  '0107': 'GmbH',
  '0108': 'Genossenschaft',
  '0109': 'Verein',
  '0110': 'Stiftung',
  '0220': 'Öffentlich-rechtlich',
  '0221': 'Öffentlich-rechtlich',
  '0222': 'Öffentlich-rechtlich',
  '0223': 'Öffentlich-rechtlich',
  '0224': 'Öffentlich-rechtlich',
  '0230': 'Öffentlich-rechtlich',
}

/** Zeichen, die in XML maskiert werden müssen. */
function xml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** SOAP-Anfrage «Search» nach Firmenname (höchstens `max` Treffer). */
export function uidAnfrage(name: string, max = 8): string {
  return (
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:uid="http://www.uid.admin.ch/xmlns/uid-wse" xmlns:ns="http://www.uid.admin.ch/xmlns/uid-wse-shared/2">' +
    '<soapenv:Header/><soapenv:Body><uid:Search><uid:searchParameters>' +
    `<ns:organisationName>${xml(name)}</ns:organisationName>` +
    '</uid:searchParameters><uid:config><ns:searchMode>Auto</ns:searchMode>' +
    `<ns:maxNumberOfRecords>${String(max)}</ns:maxNumberOfRecords>` +
    '<ns:searchNameAndAddressHistory>false</ns:searchNameAndAddressHistory>' +
    '</uid:config></uid:Search></soapenv:Body></soapenv:Envelope>'
  )
}

/** Text des ersten Elements mit diesem Namen (Namensraum-Präfix egal), entschlüsselt. */
function feld(block: string, name: string): string | null {
  const m = new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([^<]*)</(?:[\\w-]+:)?${name}>`).exec(block)
  if (!m?.[1]) return null
  const text = m[1]
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
  return text || null
}

/** Alle Blöcke eines Elements (z. B. jede gefundene Firma). */
function bloecke(text: string, name: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`, 'g')
  return [...text.matchAll(re)].map((m) => m[1] ?? '')
}

/** «CHE» + 123456789 → «CHE-123.456.789». */
export function uidFormat(kategorie: string | null, nummer: string | null): string | null {
  const ziffern = (nummer ?? '').replace(/\D/g, '')
  if (ziffern.length !== 9) return null
  return `${kategorie ?? 'CHE'}-${ziffern.slice(0, 3)}.${ziffern.slice(3, 6)}.${ziffern.slice(6)}`
}

/** Liest die SOAP-Antwort; ein SOAP-Fehler (z. B. zu viele Anfragen) wird zum DienstFehler «uid_register». */
export function uidAntwortLesen(text: string): UidFirma[] {
  if (/<(?:[\w-]+:)?Fault[\s>]/.test(text)) {
    throw new DienstFehler('uid_register', 502, feld(text, 'faultstring') ?? 'UID-Register')
  }
  const firmen: UidFirma[] = []
  for (const b of bloecke(text, 'organisationType')) {
    const uid = uidFormat(feld(b, 'uidOrganisationIdCategorie'), feld(b, 'uidOrganisationId'))
    const name = feld(b, 'organisationName')
    if (!uid || !name) continue
    const strasse = [feld(b, 'street'), feld(b, 'houseNumber')].filter(Boolean).join(' ')
    // Status nach eCH-0108: 2 = aktiv, 3 = gelöscht/inaktiv (fehlt er, gilt die Firma als aktiv).
    const status = feld(b, 'uidregStatusEnterpriseDetail')
    firmen.push({
      uid,
      name,
      rechtsform: RECHTSFORMEN[feld(b, 'legalForm') ?? ''] ?? null,
      strasse: strasse || null,
      plz: feld(b, 'swissZipCode') ?? feld(b, 'foreignZipCode'),
      ort: feld(b, 'town'),
      aktiv: status === null || status === '2' || status === '1',
    })
  }
  return firmen
}

/** Firmen zu einem Namen (mindestens drei Zeichen). Aktive zuerst. */
export async function uidSuche(name: string, basis = env('UID_URL') ?? STANDARD): Promise<UidFirma[]> {
  const suche = name.trim()
  if (suche.length < 3) return []
  const res = await rufe(
    basis,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${AKTION}"` },
      body: uidAnfrage(suche),
    },
    { zeitlimitMs: 10_000, versuche: 2 },
  )
  const text = await res.text()
  // Ein SOAP-Fehler kommt mit Status 500, darum zuerst die Antwort lesen und erst dann den Status prüfen.
  const firmen = uidAntwortLesen(text)
  if (!res.ok && firmen.length === 0) throw new DienstFehler('uid_register', res.status, `UID-Register ${res.status}`)
  return firmen.sort((a, b) => Number(b.aktiv) - Number(a.aktiv))
}
