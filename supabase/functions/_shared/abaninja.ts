// AbaNinja (V139–V145): Kunden suchen, verknüpfen, anlegen, aktualisieren, Rechnungen lesen und (Phase 10)
// Rechnungen als Entwurf übergeben sowie Zahlungen und Lieferantenrechnungen für den Abgleich lesen.
// API v2 mit Token (Bearer) und Konto-UUID, beide nur in den Secrets. Buchhaltung bleibt in AbaNinja
// (ERP-Entscheid 21.10.2026); das CRM schreibt Adressen und Rechnungsentwürfe, versendet aber nichts.

import { DienstFehler, leseJson, rufe } from './http.ts'
import { brauche, env } from './umgebung.ts'

const basis = () => `${env('ABANINJA_URL') ?? 'https://api.abaninja.ch'}/accounts/${brauche('ABANINJA_KONTO')}`

async function aba<T>(pfad: string, methode = 'GET', inhalt?: unknown): Promise<T> {
  const res = await rufe(
    `${basis()}${pfad}`,
    {
      method: methode,
      headers: {
        Authorization: `Bearer ${brauche('ABANINJA_TOKEN')}`,
        Accept: 'application/json',
        ...(inhalt !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(inhalt !== undefined ? { body: JSON.stringify(inhalt) } : {}),
    },
    { versuche: methode === 'GET' ? 3 : 1 },
  )
  const d = await leseJson<T>(res)
  if (!res.ok) {
    const code =
      res.status === 401
        ? 'abaninja_zugang'
        : res.status === 404
          ? 'nicht_gefunden'
          : res.status === 422
            ? 'abaninja_daten'
            : 'abaninja'
    throw new DienstFehler(code, res.status, 'AbaNinja')
  }
  return d as T
}

/** Kunde, wie das CRM ihn aus AbaNinja zeigt. */
export interface AbaKunde {
  uuid: string
  art: 'person' | 'company'
  name: string
  kundennummer: string
  email: string
  ort: string
}

type Roh = Record<string, unknown>
const text = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')

/** Antwort von AbaNinja (Person oder Firma) → AbaKunde. */
export function kundeLesen(r: Roh, art: 'person' | 'company'): AbaKunde {
  const kontakte = (Array.isArray(r.contacts) ? r.contacts : []) as Roh[]
  const adressen = (Array.isArray(r.addresses) ? r.addresses : []) as Roh[]
  const mail = kontakte.find((k) => k.type === 'email' && k.primary) ?? kontakte.find((k) => k.type === 'email')
  return {
    uuid: text(r.uuid),
    art,
    name: art === 'company' ? text(r.name) : [text(r.first_name), text(r.last_name)].filter(Boolean).join(' '),
    kundennummer: text(r.customer_number),
    email: text(mail?.value),
    ort: [text(adressen[0]?.zip_code), text(adressen[0]?.city)].filter(Boolean).join(' '),
  }
}

/** Passt ein AbaNinja-Kunde zum Suchbegriff (Name, Mail, Kundennummer)? */
export function passt(k: AbaKunde, begriff: string): boolean {
  const b = begriff.trim().toLowerCase()
  if (!b) return false
  return [k.name, k.email, k.kundennummer].some((f) => f.toLowerCase().includes(b))
}

/**
 * Kunden suchen. AbaNinja kennt keine Suche über die Schnittstelle, darum werden Personen und Firmen
 * seitenweise gelesen (höchstens maxSeiten × 100) und hier gefiltert.
 */
export async function kundenSuchen(begriff: string, maxSeiten = 10): Promise<AbaKunde[]> {
  const treffer: AbaKunde[] = []
  for (const art of ['person', 'company'] as const) {
    const pfad = art === 'person' ? 'persons' : 'companies'
    for (let seite = 1; seite <= maxSeiten && treffer.length < 20; seite++) {
      const d = await aba<{ data?: Roh[] }>(`/addresses/v2/${pfad}?page=${seite}&limit=100`)
      const liste = d?.data ?? []
      treffer.push(...liste.map((r) => kundeLesen(r, art)).filter((k) => passt(k, begriff)))
      if (liste.length < 100) break
    }
  }
  return treffer.slice(0, 20)
}

/** Kontakt aus dem CRM (Ausschnitt) für AbaNinja. */
export interface CrmKunde {
  art: string
  anrede?: string | null
  vorname?: string | null
  nachname?: string | null
  firma?: string | null
  email?: string | null
  telefon?: string | null
  sprache?: string | null
  kundennummer?: number | null
  strasse?: string | null
  plz?: string | null
  ort?: string | null
}

/** «Hauptstrasse 12a» → Strasse und Nummer. */
export function strasseTeilen(s: string): { address: string; street_number: string } {
  const m = /^(.*?)\s+(\d+\s*[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)$/.exec(s.trim())
  return m ? { address: m[1]!, street_number: m[2]!.replace(/\s+/g, '') } : { address: s.trim(), street_number: '' }
}

/**
 * CRM-Kontakt → AbaNinja-Adresse. anreden ordnet «Herr»/«Frau» den Werten von AbaNinja zu (Einstellung
 * abaninja.anreden, weil die erlaubten Werte je Konto verschieden sein können).
 */
export function kundeFuerAbaninja(k: CrmKunde, anreden: Record<string, string>): Roh {
  const firma = k.art === 'firma'
  const kontakte = [
    ...(k.email ? [{ type: 'email', value: k.email, primary: true }] : []),
    ...(k.telefon ? [{ type: 'phone', value: k.telefon, primary: true }] : []),
  ]
  const adresse =
    k.plz || k.ort || k.strasse
      ? [{ ...strasseTeilen(k.strasse ?? ''), zip_code: k.plz ?? '', city: k.ort ?? '', country_code: 'CH' }]
      : []
  return {
    type: firma ? 'company' : 'person',
    ...(firma
      ? { name: k.firma ?? k.nachname ?? '' }
      : {
          first_name: k.vorname ?? '',
          last_name: k.nachname ?? k.firma ?? '',
          salutation: anreden[k.anrede ?? ''] ?? anreden.standard ?? 'unknown',
        }),
    ...(k.kundennummer ? { customer_number: String(k.kundennummer) } : {}),
    language: k.sprache === 'fr' ? 'fr' : 'de',
    contacts: kontakte,
    addresses: adresse,
  }
}

/** Kunde in AbaNinja anlegen; gibt die neue UUID zurück. */
export async function kundeAnlegen(adresse: Roh): Promise<string> {
  const d = await aba<{ data?: Roh }>('/addresses/v2/addresses', 'POST', adresse)
  const uuid = text(d?.data?.uuid)
  if (!uuid) throw new DienstFehler('abaninja_daten', 502, 'Keine UUID')
  return uuid
}

/** Kunde in AbaNinja aktualisieren (ohne Typ, der lässt sich nicht ändern). */
export async function kundeAktualisieren(uuid: string, adresse: Roh): Promise<void> {
  const { type, ...rest } = adresse
  await aba(`/addresses/v2/${type === 'company' ? 'companies' : 'persons'}/${encodeURIComponent(uuid)}`, 'PATCH', rest)
}

/** Einen Kunden lesen (für die Anzeige nach dem Verknüpfen). */
export async function kundeHolen(uuid: string): Promise<AbaKunde> {
  for (const [pfad, art] of [
    ['persons', 'person'],
    ['companies', 'company'],
  ] as const) {
    try {
      const d = await aba<{ data?: Roh }>(`/addresses/v2/${pfad}/${encodeURIComponent(uuid)}`)
      if (d?.data) return kundeLesen(d.data, art)
    } catch (f) {
      if (!(f instanceof DienstFehler && f.code === 'nicht_gefunden')) throw f
    }
  }
  throw new DienstFehler('nicht_gefunden', 404, 'Kunde nicht in AbaNinja')
}

/** Rechnung, wie das CRM sie zeigt (Beträge in Rappen). */
export interface AbaRechnung {
  uuid: string
  nummer: string
  datum: string
  faellig: string
  total_rappen: number
  offen_rappen: number
  status: string
}

const rappen = (v: unknown) => Math.round(Number(v ?? 0) * 100) || 0

/** Antwort von AbaNinja (Rechnung) → AbaRechnung. Feldnamen tolerant (API v2 und ältere Antworten). */
export function rechnungLesen(r: Roh): AbaRechnung & { referenz: string; empfaenger: string[] } {
  const e = (r.receiver ?? {}) as Roh
  return {
    uuid: text(r.uuid),
    nummer: text(
      r.systemInvoiceNumber ??
        r.importedInvoiceNumber ??
        r.documentNumber ??
        r.document_number ??
        r.number ??
        r.invoiceNumber,
    ),
    datum: text(r.invoiceDate ?? r.documentDate ?? r.document_date ?? r.date).slice(0, 10),
    faellig: text(r.dueDate ?? r.due_date).slice(0, 10),
    total_rappen: rappen(r.documentTotal ?? r.total),
    offen_rappen: rappen(r.openAmount ?? r.open_amount),
    status: text(r.status),
    referenz: text(r.reference),
    empfaenger: [e.personUuid, e.companyUuid, e.person_uuid, e.company_uuid, e.uuid].map(text).filter(Boolean),
  }
}

/** Liste aus einer Antwort von AbaNinja: v2 liefert data.documents, ältere Antworten data als Liste. */
export function dokumente(d: unknown): Roh[] {
  const daten = (d as { data?: unknown } | null)?.data
  if (Array.isArray(daten)) return daten as Roh[]
  const docs = (daten as { documents?: unknown } | undefined)?.documents
  return Array.isArray(docs) ? (docs as Roh[]) : []
}

/** Alle Rechnungen seitenweise (höchstens maxSeiten × 400), optional nur seit einem Zeitpunkt geänderte. */
async function alleRechnungen(maxSeiten: number, seit?: string): Promise<ReturnType<typeof rechnungLesen>[]> {
  const alle: ReturnType<typeof rechnungLesen>[] = []
  for (let seite = 1; seite <= maxSeiten; seite++) {
    const filter = seit ? `&updatedSince=${encodeURIComponent(seit)}` : ''
    const liste = dokumente(await aba(`/documents/v2/invoices?page=${seite}&limit=400${filter}`))
    alle.push(...liste.map(rechnungLesen))
    if (liste.length < 400) break
  }
  return alle
}

/** Rechnungen eines Kunden (neueste zuerst). AbaNinja filtert nicht nach Kunde, darum seitenweise. */
export async function rechnungen(kundeUuid: string, maxSeiten = 5): Promise<AbaRechnung[]> {
  const treffer = (await alleRechnungen(maxSeiten)).filter((r) => r.empfaenger.includes(kundeUuid))
  return treffer.map(({ referenz: _r, empfaenger: _e, ...rest }) => rest).sort((a, b) => b.datum.localeCompare(a.datum))
}

/** Rechnung aus dem CRM (Ausschnitt), die als Entwurf an AbaNinja geht. */
export interface CrmRechnung {
  nummer: string
  titel: string
  datum: string
  faellig_am: string
  inkl_mwst: boolean
  mwst_satz: number
  positionen: { text: string; menge?: number; einheit?: string; preis_rappen: number }[]
}

/**
 * CRM-Rechnung → Entwurf für AbaNinja (API v2). Positionen als freie Produktzeilen mit dem MWST-Satz
 * der Rechnung, Referenz = Rechnungsnummer des CRM (darüber findet der Abgleich die Rechnung wieder).
 * Ohne Zahlungsangaben nimmt AbaNinja das Standard-Bankkonto (QR-Rechnung entsteht dort).
 */
export function rechnungFuerAbaninja(r: CrmRechnung, kundennummer: string): Roh {
  return {
    documents: [
      {
        receiver: { customerNumber: kundennummer },
        currencyCode: 'CHF',
        title: r.titel,
        reference: r.nummer,
        invoiceDate: r.datum,
        dueDate: r.faellig_am,
        pricesIncludeVat: r.inkl_mwst,
        positions: r.positionen.map((p) => ({
          kind: 'product',
          productDescription: p.text,
          quantity: Number(p.menge ?? 1),
          singlePrice: Math.round(p.preis_rappen) / 100,
          vat: { percentage: Number(r.mwst_satz) },
        })),
      },
    ],
  }
}

/** Entwurf in AbaNinja anlegen. Gibt die UUID zurück, oder null, wenn AbaNinja ihn erst in die Warteschlange legt. */
export async function rechnungAnlegen(inhalt: Roh): Promise<string | null> {
  const d = await aba<{ data?: Roh & { queueUuid?: string } }>('/documents/v2/invoices', 'POST', inhalt)
  const erste = dokumente(d)[0]
  return text(erste?.uuid ?? d?.data?.uuid) || null
}

/** Lieferantenrechnung (Beleg) aus AbaNinja, wie der Abgleich sie braucht (Beträge in Rappen). */
export interface AbaBeleg {
  uuid: string
  nummer: string
  reference: string
  titel: string
  lieferant: string
  datum: string
  faellig_am: string
  total_rappen: number
  offen_rappen: number
  storniert: boolean
}

/** Antwort von AbaNinja (Beleg) → AbaBeleg. */
export function belegLesen(r: Roh): AbaBeleg {
  const e = (r.receiver ?? {}) as Roh
  const info = (e.receiverInformation ?? {}) as Roh
  return {
    uuid: text(r.uuid),
    nummer: text(r.receiptNumber),
    reference: text(r.reference),
    titel: text(r.title),
    lieferant: text(info.companyName ?? info.name ?? e.name),
    datum: text(r.invoiceDate).slice(0, 10),
    faellig_am: text(r.dueDate).slice(0, 10),
    total_rappen: rappen(r.documentTotal),
    offen_rappen: rappen(r.openAmount),
    storniert: r.isCancelled === true,
  }
}

/** Abgleich: Rechnungen (für Zahlungen) und Lieferantenrechnungen, optional nur seit einem Zeitpunkt geänderte. */
export async function abgleichDaten(seit?: string, maxSeiten = 10) {
  const re = await alleRechnungen(maxSeiten, seit)
  const belege: AbaBeleg[] = []
  for (let seite = 1; seite <= maxSeiten; seite++) {
    const filter = seit ? `&updatedSince=${encodeURIComponent(seit)}` : ''
    const liste = dokumente(await aba(`/documents/v2/receipts?page=${seite}&limit=400${filter}`))
    belege.push(...liste.filter((b) => b.isArchived !== true).map(belegLesen))
    if (liste.length < 400) break
  }
  return {
    rechnungen: re
      .filter((r) => r.referenz)
      .map((r) => ({
        uuid: r.uuid,
        reference: r.referenz,
        nummer: r.nummer,
        status: r.status,
        total_rappen: r.total_rappen,
        offen_rappen: r.offen_rappen,
        datum: r.datum,
      })),
    belege,
  }
}

/** Verbindungstest: eine Person lesen. */
export async function testen(): Promise<void> {
  await aba('/addresses/v2/persons?page=1&limit=1')
}
