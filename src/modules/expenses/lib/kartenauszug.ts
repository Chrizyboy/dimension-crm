/** Eine Zeile aus dem Auszug der Firmenkarte, so wie sie an `firmenkarte_einlesen` geht. */
export interface KartenZeile {
  datum: string
  betrag_rappen: number
  text: string
  karte: string | null
}

/** Ergebnis des Lesens: Zeilen und wie viele Zeilen nicht lesbar waren (für die Rückmeldung). */
export interface KartenAuszug {
  zeilen: KartenZeile[]
  unlesbar: number
}

// Spaltennamen der üblichen Schweizer Kartenauszüge (Viseca, UBS, Cornèrcard, PostFinance), DE/FR/EN.
const SPALTEN = {
  datum: [
    'einkaufsdatum',
    'transaktionsdatum',
    'kaufdatum',
    'datum',
    'date',
    'date d’achat',
    "date d'achat",
    'date de transaction',
  ],
  betrag: ['belastung', 'betrag chf', 'betrag', 'montant chf', 'montant', 'débit', 'debit', 'amount'],
  gutschrift: ['gutschrift', 'crédit', 'credit'],
  text: [
    'beschreibung',
    'buchungstext',
    'händler',
    'haendler',
    'text',
    'description',
    'commerçant',
    'libellé',
    'merchant',
  ],
  karte: ['kartennummer', 'karte', 'numéro de carte', 'carte', 'card number', 'card'],
} as const

function trenner(kopf: string): string {
  const zaehle = (z: string) => kopf.split(z).length
  return [';', '\t', ','].reduce((a, b) => (zaehle(b) > zaehle(a) ? b : a))
}

/** CSV-Zeile mit Anführungszeichen ("a;b" bleibt ein Feld). */
function felder(zeile: string, t: string): string[] {
  const aus: string[] = []
  let feld = ''
  let inZitat = false
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile.charAt(i)
    if (c === '"') {
      if (inZitat && zeile[i + 1] === '"') {
        feld += '"'
        i++
      } else inZitat = !inZitat
    } else if (c === t && !inZitat) {
      aus.push(feld.trim())
      feld = ''
    } else feld += c
  }
  aus.push(feld.trim())
  return aus
}

function spalte(kopf: string[], namen: readonly string[]): number {
  for (const n of namen) {
    const i = kopf.findIndex((k) => k === n)
    if (i >= 0) return i
  }
  for (const n of namen) {
    const i = kopf.findIndex((k) => k.includes(n))
    if (i >= 0) return i
  }
  return -1
}

/** «31.10.2026», «31.10.26», «2026-10-31» oder «31/10/2026» → «2026-10-31». */
export function kartenDatum(text: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const ch = /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/.exec(text)
  if (!ch) return null
  const [, t, m, j] = ch as unknown as [string, string, string, string]
  const jahr = j.length === 2 ? `20${j}` : j
  return `${jahr}-${m.padStart(2, '0')}-${t.padStart(2, '0')}`
}

/** «1'234.50», «1 234,50», «-12.40», «CHF 96.40» → Rappen; leer oder unlesbar → null. */
export function kartenBetrag(text: string): number | null {
  const s = text.replace(/chf/gi, '').replace(/['’\s\u00a0]/g, '')
  if (!s) return null
  const komma = s.lastIndexOf(',')
  const punkt = s.lastIndexOf('.')
  const normal = komma > punkt ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  if (!/^[-+]?\d+(\.\d{1,2})?$/.test(normal)) return null
  return Math.round(Number(normal) * 100)
}

/**
 * Liest den CSV-Auszug der Firmenkarte. Die Kopfzeile wird gesucht (Banken schreiben oft Zeilen davor), Spalten
 * werden über ihre Namen gefunden. Belastungen sind positiv, Gutschriften negativ. Zeilen ohne Datum oder Betrag
 * (Zwischentotal, Saldo) zählen als unlesbar und werden nicht eingelesen.
 */
export function leseKartenauszug(inhalt: string): KartenAuszug {
  const zeilen = inhalt
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((z) => z.trim())
  const kopfIndex = zeilen.findIndex((z) => {
    const k = z.toLowerCase()
    return (
      SPALTEN.datum.some((n) => k.includes(n)) && [...SPALTEN.betrag, ...SPALTEN.gutschrift].some((n) => k.includes(n))
    )
  })
  if (kopfIndex < 0) return { zeilen: [], unlesbar: zeilen.length }
  const t = trenner(zeilen[kopfIndex] ?? '')
  const kopf = felder(zeilen[kopfIndex] ?? '', t).map((k) => k.toLowerCase().replace(/"/g, ''))
  const iDatum = spalte(kopf, SPALTEN.datum)
  const iBetrag = spalte(kopf, SPALTEN.betrag)
  const iGut = spalte(kopf, SPALTEN.gutschrift)
  const iText = spalte(kopf, SPALTEN.text)
  const iKarte = spalte(kopf, SPALTEN.karte)
  const aus: KartenZeile[] = []
  let unlesbar = 0
  for (const zeile of zeilen.slice(kopfIndex + 1)) {
    const f = felder(zeile, t)
    const datum = kartenDatum(f[iDatum] ?? '')
    const last = iBetrag >= 0 ? kartenBetrag(f[iBetrag] ?? '') : null
    const gut = iGut >= 0 && iGut !== iBetrag ? kartenBetrag(f[iGut] ?? '') : null
    const betrag = last ?? (gut === null ? null : -Math.abs(gut))
    if (!datum || !betrag) {
      unlesbar++
      continue
    }
    aus.push({
      datum,
      betrag_rappen: betrag,
      text: (iText >= 0 ? f[iText] : '')?.slice(0, 200) ?? '',
      karte: iKarte >= 0 ? f[iKarte] || null : null,
    })
  }
  return { zeilen: aus, unlesbar }
}
