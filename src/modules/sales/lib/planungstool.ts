import { telefonZiffern } from '@/lib/kontakt'
import type { Geschaeft } from '../types'

type Zelle = string | number | boolean | Date | null | undefined

/** Ein Lead aus dem Planungstool-Excel (V233 readWorkbook). */
export interface ExcelLead {
  zeile: number
  leadId: string
  name: string
  quelle: string
  tour: string
  eingang: string | null
  strasse: string
  plz: string
  ort: string
  telefon: string
  email: string
  objekttyp: string
  erreichbarkeit: string
  kommentar: string
  status: string
  notiz: string
}

const SPALTEN = {
  name: 'Name',
  leadId: 'Lead-ID',
  quelle: 'Lead-Quelle',
  tour: 'Tour / Region',
  eingang: 'Eingegangen',
  strasse: 'Strasse/Nr',
  plz: 'PLZ',
  ort: 'Ort',
  telefon: 'Telefonnummer',
  email: 'E-Mail-Adresse',
  objekttyp: 'Objekttyp',
  erreichbarkeit: 'Erreichbarkeit',
  kommentar: 'Kunden-Kommentar',
  status: 'Status',
  notiz: 'Interne Notiz',
} as const

const text = (v: Zelle) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v).trim())

/** Excel-Datum (Zahl seit 1900), Date oder «21.10.2026» → ISO-Datum. */
export function excelDatum(v: Zelle): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 20000)
    return new Date(Math.round((v - 25569) * 86_400_000)).toISOString().slice(0, 10)
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(text(v))
  if (m) return `${m[3]?.length === 2 ? `20${m[3]}` : m[3]}-${m[2]?.padStart(2, '0')}-${m[1]?.padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}/.test(text(v)) ? text(v).slice(0, 10) : null
}

/**
 * Sucht in allen Blättern (zuerst «Leads») die Kopfzeile mit «Name» und «Lead-ID» und liest die Zeilen
 * darunter. Fehlt sie, ist es nicht das Planungstool-Excel.
 */
export function lesePlanungstool(
  blaetter: readonly { sheet: string; data: readonly (readonly Zelle[])[] }[],
): ExcelLead[] | null {
  const reihe = [...blaetter].sort((a, b) => (a.sheet === 'Leads' ? -1 : b.sheet === 'Leads' ? 1 : 0))
  for (const b of reihe) {
    const kopf = b.data.findIndex((z) => z.some((c) => text(c) === 'Lead-ID') && z.some((c) => text(c) === 'Name'))
    if (kopf < 0) continue
    const titel = (b.data[kopf] ?? []).map(text)
    const spalte = (k: keyof typeof SPALTEN) => titel.indexOf(SPALTEN[k])
    const wert = (z: readonly Zelle[], k: keyof typeof SPALTEN) => (spalte(k) >= 0 ? z[spalte(k)] : null)
    const aus: ExcelLead[] = []
    b.data.slice(kopf + 1).forEach((z, i) => {
      const name = text(wert(z, 'name'))
      if (!name || name === 'Name') return
      aus.push({
        zeile: kopf + i + 2,
        leadId: text(wert(z, 'leadId')),
        name,
        quelle: text(wert(z, 'quelle')),
        tour: text(wert(z, 'tour')),
        eingang: excelDatum(wert(z, 'eingang')),
        strasse: text(wert(z, 'strasse')),
        plz: text(wert(z, 'plz')).replace(/\.0$/, ''),
        ort: text(wert(z, 'ort')),
        telefon: text(wert(z, 'telefon')),
        email: text(wert(z, 'email')).toLowerCase(),
        objekttyp: text(wert(z, 'objekttyp')),
        erreichbarkeit: text(wert(z, 'erreichbarkeit')),
        kommentar: text(wert(z, 'kommentar')),
        status: text(wert(z, 'status')),
        notiz: text(wert(z, 'notiz')),
      })
    })
    return aus
  }
  return null
}

/**
 * Gibt es den Lead schon? Gleiche Lead-Nummer, gleiche Telefonnummer, gleiche Mail
 * oder gleicher Name an derselben PLZ. Nur wirklich neue Leads werden übernommen (V233).
 */
export function findeBestehend(l: ExcelLead, bestehend: readonly Geschaeft[]): Geschaeft | null {
  const tel = telefonZiffern(l.telefon).replace(/^(0041|41|0)/, '')
  const name = l.name.toLowerCase()
  return (
    bestehend.find(
      (g) =>
        (l.leadId && g.nummer === l.leadId) ||
        (tel.length >= 9 && g.telefonZiffern.replace(/^(0041|41|0)/, '') === tel) ||
        (l.email && g.email?.toLowerCase() === l.email) ||
        (g.name.toLowerCase() === name && (!l.plz || g.plz === l.plz)),
    ) ?? null
  )
}

/** «Muster Anna» → Nachname «Muster», Vorname «Anna» (Reihenfolge im Planungstool). */
export function trenneName(name: string): { vorname: string; nachname: string } {
  const teile = name.trim().split(/\s+/)
  if (teile.length < 2) return { vorname: '', nachname: name.trim() }
  return { nachname: teile[0] ?? '', vorname: teile.slice(1).join(' ') }
}
