import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib'
import { formatChf, formatDatum } from '@/lib/format'
import { sicher } from '@/services/zahlteil'
import { summe } from '../lib/spesen'
import type { Spese } from '../types'
import { belegAdresse } from './spesen'

/** Texte der Abrechnung in der Sprache der Oberfläche. */
export interface AbrechnungTexte {
  titel: string
  kopf: [string, string, string, string, string, string]
  total: string
  vorsteuer: string
  unterschriftPerson: string
  unterschriftBuchhaltung: string
  belege: string
  ohneBeleg: string
  kategorie: (k: string) => string
}

const A4: [number, number] = [595.28, 841.89]
const RAND = 48

/** Text auf eine Breite kürzen (pdf-lib bricht nicht selbst um). */
function kuerzen(text: string, font: PDFFont, groesse: number, breite: number): string {
  let t = sicher(text)
  while (t.length > 1 && font.widthOfTextAtSize(t, groesse) > breite) t = t.slice(0, -2) + '…'
  return t
}

/** Beleg holen: Bild als Seite, PDF mit allen Seiten. Fehler machen nur einen Vermerk statt eines Abbruchs. */
async function belegAnhaengen(doc: PDFDocument, s: Spese, fett: PDFFont, normal: PDFFont): Promise<void> {
  const { PDFDocument: Pdf } = await import('pdf-lib')
  const adresse = s.beleg_id ? await belegAdresse(s.beleg_id) : null
  if (!adresse) return
  const bytes = new Uint8Array(await (await fetch(adresse)).arrayBuffer())
  const titel = `${formatDatum(s.datum)} · ${s.zweck ?? ''} · ${formatChf(s.betrag_rappen, { mitWaehrung: true })}`
  const typ = s.beleg_typ ?? ''
  if (typ.includes('pdf') || (s.beleg_name ?? '').toLowerCase().endsWith('.pdf')) {
    const quelle = await Pdf.load(bytes, { ignoreEncryption: true })
    const seiten = await doc.copyPages(quelle, quelle.getPageIndices())
    for (const p of seiten) {
      doc.addPage(p)
      p.drawText(kuerzen(titel, normal, 8, p.getWidth() - 2 * RAND), { x: RAND, y: 14, size: 8, font: normal })
    }
    return
  }
  const bild = typ.includes('png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
  const seite = doc.addPage(A4)
  seite.drawText(kuerzen(titel, fett, 10, A4[0] - 2 * RAND), { x: RAND, y: A4[1] - RAND, size: 10, font: fett })
  const massstab = Math.min((A4[0] - 2 * RAND) / bild.width, (A4[1] - 2 * RAND - 30) / bild.height, 1)
  const b = bild.width * massstab
  const h = bild.height * massstab
  seite.drawImage(bild, { x: (A4[0] - b) / 2, y: A4[1] - RAND - 24 - h, width: b, height: h })
}

/** Eine Seite «Spesenabrechnung» je Person: Liste, Total, Vorsteuer, Unterschriften. */
function abrechnungSeite(
  seite: PDFPage,
  person: string,
  titel: string,
  spesen: Spese[],
  texte: AbrechnungTexte,
  fett: PDFFont,
  normal: PDFFont,
): void {
  let y = A4[1] - RAND
  seite.drawText('Dimension Solaire', { x: RAND, y, size: 9, font: normal })
  y -= 26
  seite.drawText(sicher(`${texte.titel} · ${person}`), { x: RAND, y, size: 16, font: fett })
  y -= 18
  seite.drawText(sicher(titel), { x: RAND, y, size: 10, font: normal })
  y -= 28
  const spalten = [RAND, RAND + 62, RAND + 250, RAND + 360, RAND + 420]
  const rechts = A4[0] - RAND
  texte.kopf.slice(0, 5).forEach((k, i) => {
    seite.drawText(sicher(k), { x: spalten[i] ?? RAND, y, size: 8, font: fett })
  })
  seite.drawText(sicher(texte.kopf[5]), {
    x: rechts - fett.widthOfTextAtSize(texte.kopf[5], 8),
    y,
    size: 8,
    font: fett,
  })
  y -= 14
  for (const s of spesen) {
    if (y < RAND + 120) break // eine Seite reicht für einen Monat; mehr kommt als eigene Abrechnung
    const betrag = formatChf(s.betrag_rappen)
    const zellen = [
      formatDatum(s.datum),
      kuerzen(s.zweck ?? '', normal, 9, 182),
      kuerzen(`${texte.kategorie(s.kategorie)}${s.konto ? ` (${s.konto})` : ''}`, normal, 9, 104),
      s.projekt_nummer ?? '',
      s.mwst_rappen ? formatChf(s.mwst_rappen) : '',
    ]
    zellen.forEach((z, i) => {
      seite.drawText(sicher(z), { x: spalten[i] ?? RAND, y, size: 9, font: normal })
    })
    seite.drawText(betrag, { x: rechts - normal.widthOfTextAtSize(betrag, 9), y, size: 9, font: normal })
    if (!s.beleg_id && s.art === 'beleg')
      seite.drawText(sicher(texte.ohneBeleg), { x: spalten[1] ?? RAND, y: y - 9, size: 7, font: normal })
    y -= s.beleg_id || s.art !== 'beleg' ? 14 : 22
  }
  y -= 6
  seite.drawLine({ start: { x: RAND, y: y + 10 }, end: { x: rechts, y: y + 10 }, thickness: 0.5 })
  const total = formatChf(summe(spesen), { mitWaehrung: true })
  seite.drawText(sicher(texte.total), { x: RAND, y: y - 4, size: 11, font: fett })
  seite.drawText(total, { x: rechts - fett.widthOfTextAtSize(total, 11), y: y - 4, size: 11, font: fett })
  const vorsteuer = formatChf(
    spesen.reduce((a, s) => a + (s.mwst_rappen ?? 0), 0),
    { mitWaehrung: true },
  )
  seite.drawText(sicher(`${texte.vorsteuer} ${vorsteuer}`), { x: RAND, y: y - 20, size: 9, font: normal })
  const u = RAND + 40
  seite.drawLine({ start: { x: RAND, y: u }, end: { x: RAND + 200, y: u }, thickness: 0.5 })
  seite.drawLine({ start: { x: rechts - 200, y: u }, end: { x: rechts, y: u }, thickness: 0.5 })
  seite.drawText(sicher(texte.unterschriftPerson), { x: RAND, y: u - 12, size: 8, font: normal })
  seite.drawText(sicher(texte.unterschriftBuchhaltung), { x: rechts - 200, y: u - 12, size: 8, font: normal })
}

/**
 * Spesenabrechnung als PDF (für Lohn, Treuhand und Ablage): je Person eine Seite mit Liste, Total, Vorsteuer und
 * Unterschriften, danach alle Belege der Person als Seiten. pdf-lib wird erst hier geladen.
 */
export async function abrechnungPdf(
  personen: { person: string; spesen: Spese[] }[],
  titel: string,
  texte: AbrechnungTexte,
): Promise<Uint8Array> {
  const { PDFDocument: Pdf, StandardFonts } = await import('pdf-lib')
  const doc = await Pdf.create()
  doc.setTitle(sicher(`${texte.titel} ${titel}`))
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const fett = await doc.embedFont(StandardFonts.HelveticaBold)
  for (const p of personen) {
    const sortiert = [...p.spesen].sort((a, b) => a.datum.localeCompare(b.datum))
    abrechnungSeite(doc.addPage(A4), p.person, titel, sortiert, texte, fett, normal)
    for (const s of sortiert) {
      try {
        await belegAnhaengen(doc, s, fett, normal)
      } catch {
        const seite = doc.addPage(A4)
        seite.drawText(sicher(`${texte.belege}: ${s.zweck ?? ''} – ${texte.ohneBeleg}`), {
          x: RAND,
          y: A4[1] - RAND,
          size: 10,
          font: normal,
        })
      }
    }
  }
  return doc.save()
}
