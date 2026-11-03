import type { BerichtZeile } from '../lib/bericht'

/** Die Standardschrift kennt nur WinAnsi; andere Zeichen (z. B. «≤», schmale Leerzeichen) würden abbrechen. */
function sicher(text: string): string {
  return text
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[‐-–−]/g, '-')
    .replace(/[^\n\u0020-\u007e\u00a0-\u00ff\u2018-\u201e\u2022\u2026]/g, '')
}

/** Beschriftungen in der Sprache der Person. */
export interface BerichtTexte {
  titel: string
  untertitel: string
  spalten: [string, string, string, string]
  zeilen: Record<string, string>
  fuss: string
}

/**
 * Monatsbericht als PDF (A4 hoch): Titel, Tabelle Kennzahl / Monat / Vorjahr / Ziel, Fusszeile mit Stand.
 * pdf-lib wird erst hier geladen, nicht mit der App.
 */
export async function monatsberichtPdf(zeilen: readonly BerichtZeile[], texte: BerichtTexte): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(sicher(texte.titel))
  doc.setAuthor('Dimension Solaire')
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const fett = await doc.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.008, 0.133, 0.31)
  const grau = rgb(0.275, 0.318, 0.388)
  const linie = rgb(0.85, 0.87, 0.9)
  const orange = rgb(0.937, 0.486, 0)
  const seite = doc.addPage([595.28, 841.89])
  const links = 50
  const breite = 495
  let y = 790

  seite.drawText('DIMENSION', { x: links, y, size: 11, font: fett, color: navy })
  seite.drawText('WORK', { x: links + fett.widthOfTextAtSize('DIMENSION', 11), y, size: 11, font: fett, color: orange })
  y -= 34
  seite.drawText(sicher(texte.titel), { x: links, y, size: 18, font: fett, color: navy })
  y -= 18
  seite.drawText(sicher(texte.untertitel), { x: links, y, size: 9.5, font: normal, color: grau })
  y -= 28

  const spalten = [links, links + 200, links + 300, links + 400]
  texte.spalten.forEach((s, i) => {
    seite.drawText(sicher(s).toUpperCase(), { x: spalten[i] ?? links, y, size: 8, font: fett, color: grau })
  })
  y -= 8
  seite.drawLine({ start: { x: links, y }, end: { x: links + breite, y }, thickness: 0.8, color: linie })

  for (const z of zeilen) {
    y -= 20
    const werte = [texte.zeilen[z.id] ?? z.id, z.wert, z.vorjahr, z.ziel]
    werte.forEach((w, i) => {
      const text = sicher(w)
      // Lange Werte (Betrag + Anzahl) verkleinern, damit sie nicht in die nächste Spalte laufen.
      const groesse = normal.widthOfTextAtSize(text, 9.5) > 95 && i > 0 ? 8 : 9.5
      seite.drawText(text, { x: spalten[i] ?? links, y, size: groesse, font: i === 0 ? fett : normal, color: navy })
    })
    y -= 7
    seite.drawLine({ start: { x: links, y }, end: { x: links + breite, y }, thickness: 0.5, color: linie })
  }

  seite.drawText(sicher(texte.fuss), { x: links, y: 40, size: 8, font: normal, color: grau })
  return doc.save()
}
