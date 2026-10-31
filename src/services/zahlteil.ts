import type { TFunction } from 'i18next'
import type { PDFFont, PDFPage } from 'pdf-lib'
import qrcode from 'qrcode-generator'
import { formatChf } from '@/lib/format'
import { ibanAnzeige, qrInhalt, type QrAdresse } from '@/lib/rechnung'

const MM = 72 / 25.4

/** Die Standardschrift kennt nur WinAnsi; andere Zeichen würden den PDF-Bau abbrechen. */
export function sicher(text: string): string {
  return text
    .replace(/[\u2010-\u2013\u2212]/g, '-')
    .replace(/[^\u0020-\u007e\u00a0-\u00ff\u2018-\u201e\u2020\u2022\u2026\u20ac]/g, '?')
}

/** QR-Matrix; der Inhalt wird als UTF-8-Bytes übergeben (Swiss QR verlangt UTF-8, die Bibliothek nur Latin-1). */
function matrix(inhalt: string): boolean[][] {
  const q = qrcode(0, 'M')
  const bytes = new TextEncoder().encode(inhalt)
  q.addData(String.fromCharCode(...bytes), 'Byte')
  q.make()
  const n = q.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)))
}

/**
 * Zeichnet den QR-Zahlteil (Empfangsschein 62 mm + Zahlteil 148 mm, Höhe 105 mm) unten auf die Seite,
 * mit Schweizerkreuz in der Mitte des Codes (46 × 46 mm). Texte in der Sprache der Rechnung.
 */
export async function zahlteilZeichnen(
  seite: PDFPage,
  schrift: { normal: PDFFont; fett: PDFFont },
  t: TFunction,
  e: {
    iban: string
    glaeubiger: QrAdresse
    schuldner: QrAdresse | null
    betragRappen: number | null
    mitteilung: string
  },
): Promise<void> {
  const { rgb } = await import('pdf-lib')
  const schwarz = rgb(0, 0, 0)
  const h = 105 * MM
  seite.drawRectangle({ x: 0, y: 0, width: 210 * MM, height: h, color: rgb(1, 1, 1) })
  seite.drawLine({
    start: { x: 0, y: h },
    end: { x: 210 * MM, y: h },
    thickness: 0.5,
    dashArray: [3, 2],
    color: schwarz,
  })
  seite.drawLine({
    start: { x: 62 * MM, y: 0 },
    end: { x: 62 * MM, y: h },
    thickness: 0.5,
    dashArray: [3, 2],
    color: schwarz,
  })

  const schreibe = (s: string, x: number, y: number, groesse: number, fett = false) => {
    seite.drawText(sicher(s), { x, y, size: groesse, font: fett ? schrift.fett : schrift.normal, color: schwarz })
  }
  const adressZeilen = (a: QrAdresse) =>
    [a.name, a.strasse ?? '', [a.plz, a.ort].filter(Boolean).join(' ')].filter((z) => z.trim())
  const betrag = e.betragRappen == null ? '' : formatChf(e.betragRappen).replace(/'/g, ' ')

  // Empfangsschein
  let y = h - 5 * MM - 11
  schreibe(t('rechnungen.qr.empfangsschein'), 5 * MM, y, 11, true)
  y -= 18
  schreibe(t('rechnungen.qr.konto'), 5 * MM, y, 6, true)
  for (const z of [ibanAnzeige(e.iban), ...adressZeilen(e.glaeubiger)]) schreibe(z, 5 * MM, (y -= 9), 8)
  y -= 14
  schreibe(t('rechnungen.qr.zahlbarDurch'), 5 * MM, y, 6, true)
  for (const z of e.schuldner ? adressZeilen(e.schuldner) : ['']) schreibe(z, 5 * MM, (y -= 9), 8)
  y = 37 * MM
  schreibe(t('rechnungen.qr.waehrung'), 5 * MM, y, 6, true)
  schreibe(t('rechnungen.qr.betrag'), 20 * MM, y, 6, true)
  schreibe('CHF', 5 * MM, y - 10, 8)
  schreibe(betrag, 20 * MM, y - 10, 8)
  schreibe(t('rechnungen.qr.annahmestelle'), 38 * MM, 18 * MM, 6, true)

  // Zahlteil
  const x0 = 67 * MM
  schreibe(t('rechnungen.qr.zahlteil'), x0, h - 5 * MM - 11, 11, true)
  const felder = matrix(qrInhalt(e))
  const n = felder.length
  const groesse = 46 * MM
  const qx = x0
  const qy = 42 * MM
  const m = groesse / n
  felder.forEach((zeile, r) => {
    zeile.forEach((dunkel, c) => {
      if (dunkel)
        seite.drawRectangle({ x: qx + c * m, y: qy + groesse - (r + 1) * m, width: m, height: m, color: schwarz })
    })
  })
  // Schweizerkreuz 7 × 7 mm mit weissem Rand
  const k = 7 * MM
  const kx = qx + groesse / 2 - k / 2
  const ky = qy + groesse / 2 - k / 2
  seite.drawRectangle({ x: kx - 0.8, y: ky - 0.8, width: k + 1.6, height: k + 1.6, color: rgb(1, 1, 1) })
  seite.drawRectangle({ x: kx, y: ky, width: k, height: k, color: schwarz })
  const b = k * 0.2
  const l = k * 0.6
  seite.drawRectangle({ x: kx + (k - b) / 2, y: ky + (k - l) / 2, width: b, height: l, color: rgb(1, 1, 1) })
  seite.drawRectangle({ x: kx + (k - l) / 2, y: ky + (k - b) / 2, width: l, height: b, color: rgb(1, 1, 1) })

  schreibe(t('rechnungen.qr.waehrung'), x0, 37 * MM, 8, true)
  schreibe(t('rechnungen.qr.betrag'), x0 + 18 * MM, 37 * MM, 8, true)
  schreibe('CHF', x0, 37 * MM - 12, 10)
  schreibe(betrag, x0 + 18 * MM, 37 * MM - 12, 10)

  const x1 = 118 * MM
  y = h - 5 * MM - 8
  schreibe(t('rechnungen.qr.konto'), x1, y, 8, true)
  for (const z of [ibanAnzeige(e.iban), ...adressZeilen(e.glaeubiger)]) schreibe(z, x1, (y -= 11), 10)
  y -= 16
  schreibe(t('rechnungen.qr.info'), x1, y, 8, true)
  schreibe(e.mitteilung, x1, (y -= 11), 10)
  y -= 16
  schreibe(t('rechnungen.qr.zahlbarDurch'), x1, y, 8, true)
  for (const z of e.schuldner ? adressZeilen(e.schuldner) : ['']) schreibe(z, x1, (y -= 11), 10)
}
