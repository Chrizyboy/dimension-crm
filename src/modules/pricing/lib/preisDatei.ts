/**
 * Preisliste aus einer Datei lesen (Eturnity-Export oder Lieferant): Spalten erkennen, Zeilen in die Form von
 * `preis_import_anlegen` bringen. Die Zuordnung ist änderbar und wird beim nächsten Mal wieder vorgeschlagen.
 */

type Zelle = string | number | boolean | Date | null | undefined

/** Felder, die eine Preisliste liefern kann. Pflicht: Name oder Artikelnummer, dazu der Preis. */
export const IMPORT_FELDER = ['artikelnummer', 'name', 'ek', 'lieferant', 'hersteller', 'einheit', 'leistung_w'] as const
export type ImportFeld = (typeof IMPORT_FELDER)[number]
export type Zuordnung = Partial<Record<ImportFeld, number>>

/** Übliche Spaltennamen (DE/FR/EN, Eturnity, Krannich, Solarmarkt, Tritec), klein und ohne Sonderzeichen. */
const MUSTER: Record<ImportFeld, RegExp> = {
  artikelnummer: /^(art(ikel)?\s*nr|artikel\s*nummer|artikelnr|art\s*no|sku|article|no\s*article|ref(erence)?|produktnummer|item\s*(no|number)|materialnummer|mpn)/,
  name: /^(bezeichnung|artikel\s*bezeichnung|artikelname|name|produkt(name)?|designation|description|beschreibung|libelle|komponente|component|model(l)?)/,
  ek: /(einkauf|^ek\b|^ek\s|netto\s*preis|nettopreis|net\s*price|prix\s*net|^preis|^price|^prix|kosten|cost|unit\s*price)/,
  lieferant: /^(lieferant|supplier|fournisseur|distributor|grosshändler|haendler|händler)/,
  hersteller: /^(hersteller|marke|brand|manufacturer|fabricant)/,
  einheit: /^(einheit|unit|unite|unité|me\b|mengeneinheit)/,
  leistung_w: /^(leistung|power|puissance|wp\b|watt|nennleistung)/,
}

function sauber(text: Zelle): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[._\-/()[\]:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Zeile mit den Spaltennamen finden: die erste unter den ersten 15, in der Name/Nummer und Preis erkannt werden. */
export function findeKopfzeile(blatt: readonly (readonly Zelle[])[]): number {
  for (let i = 0; i < Math.min(15, blatt.length); i++) {
    const z = erkenneSpalten(blatt[i] ?? [])
    if ((z.name !== undefined || z.artikelnummer !== undefined) && z.ek !== undefined) return i
  }
  return 0
}

/** Spalten anhand der Überschriften zuordnen; jede Spalte höchstens einmal. */
export function erkenneSpalten(kopf: readonly Zelle[]): Zuordnung {
  const z: Zuordnung = {}
  const vergeben = new Set<number>()
  for (const feld of IMPORT_FELDER) {
    const i = kopf.findIndex((k, j) => !vergeben.has(j) && MUSTER[feld].test(sauber(k)))
    if (i >= 0) {
      z[feld] = i
      vergeben.add(i)
    }
  }
  return z
}

/** Betrag in Rappen aus «1'234.50», «1.234,50», «CHF 1234», «1 234,5» oder einer Zahl. Ungültig → null. */
export function leseBetrag(wert: Zelle): number | null {
  if (typeof wert === 'number') return Number.isFinite(wert) ? Math.round(wert * 100) : null
  let s = String(wert ?? '')
    .replace(/chf|fr\.|€|eur/gi, '')
    .replace(/[\s'’]/g, '')
  if (!s) return null
  // Dezimaltrennzeichen = das letzte Komma oder der letzte Punkt mit 1–2 Ziffern dahinter.
  const m = /[.,](\d{1,2})$/.exec(s)
  if (m) s = s.slice(0, m.index).replace(/[.,]/g, '') + '.' + m[1]
  else s = s.replace(/[.,]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

function text(wert: Zelle): string {
  if (wert instanceof Date) return wert.toISOString().slice(0, 10)
  return String(wert ?? '').trim()
}

/** Eine Zeile für `preis_import_anlegen`. */
export interface DateiZeile {
  artikelnummer: string
  name: string
  ek_rappen: number | null
  lieferant?: string
  hersteller?: string
  einheit?: string
  leistung_w?: number
}

/** Zeilen ab der Kopfzeile lesen; leere Zeilen und Zeilen ohne Preis fallen weg. */
export function leseZeilen(blatt: readonly (readonly Zelle[])[], kopfzeile: number, z: Zuordnung): DateiZeile[] {
  const zelle = (r: readonly Zelle[], f: ImportFeld) => (z[f] === undefined ? undefined : r[z[f]])
  const aus: DateiZeile[] = []
  for (const r of blatt.slice(kopfzeile + 1)) {
    const nr = text(zelle(r, 'artikelnummer'))
    const name = text(zelle(r, 'name'))
    const ek = leseBetrag(zelle(r, 'ek'))
    if ((!nr && !name) || ek === null || ek <= 0) continue
    const w = Number(String(zelle(r, 'leistung_w') ?? '').replace(/[^\d.]/g, ''))
    aus.push({
      artikelnummer: nr,
      name,
      ek_rappen: ek,
      ...(text(zelle(r, 'lieferant')) ? { lieferant: text(zelle(r, 'lieferant')) } : {}),
      ...(text(zelle(r, 'hersteller')) ? { hersteller: text(zelle(r, 'hersteller')) } : {}),
      ...(text(zelle(r, 'einheit')) ? { einheit: text(zelle(r, 'einheit')) } : {}),
      ...(w > 0 && w < 100000 ? { leistung_w: Math.round(w) } : {}),
    })
  }
  return aus
}

/** CSV (Trennzeichen ; , oder Tab, Anführungszeichen) in Zeilen und Zellen. */
export function leseCsv(inhalt: string): string[][] {
  const erste = inhalt.split(/\r?\n/, 1)[0] ?? ''
  const trenner = [';', '\t', ','].sort((a, b) => erste.split(b).length - erste.split(a).length)[0] ?? ';'
  const zeilen: string[][] = []
  let zeile: string[] = []
  let feld = ''
  let inAnf = false
  for (let i = 0; i < inhalt.length; i++) {
    const c = inhalt[i]
    if (inAnf) {
      if (c === '"' && inhalt[i + 1] === '"') {
        feld += '"'
        i++
      } else if (c === '"') inAnf = false
      else feld += c
    } else if (c === '"') inAnf = true
    else if (c === trenner) {
      zeile.push(feld)
      feld = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && inhalt[i + 1] === '\n') i++
      zeile.push(feld)
      zeilen.push(zeile)
      zeile = []
      feld = ''
    } else feld += c
  }
  if (feld || zeile.length) {
    zeile.push(feld)
    zeilen.push(zeile)
  }
  return zeilen.filter((r) => r.some((x) => x.trim()))
}
