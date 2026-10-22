import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib'

/**
 * Kleiner Schreiber für A4-Seiten mit pdf-lib (Rapport, IBN-Protokoll, Anlagedossier): Text mit Umbruch,
 * Angaben-Zeilen, Linien, Bilder; neue Seite, wenn es unten nicht mehr passt. pdf-lib wird erst hier geladen.
 */

const NAVY = [0.063, 0.149, 0.247] as const
const GRAU = [0.353, 0.392, 0.451] as const
const ORANGE = [0.969, 0.576, 0.118] as const
export const BREITE = 595.28
export const HOEHE = 841.89
const RAND = 50

/** Die Standardschrift kennt nur WinAnsi; andere Zeichen würden den PDF-Bau abbrechen. */
export function sicher(text: string): string {
  return text
    .replace(/[\u2010-\u2013]/g, '-')
    .replace(/Ω/g, 'Ohm')
    .replace(/[^\n -~\u00a0-\u00ff\u2018-\u201e\u2020\u2022\u2026\u20ac]/g, '?')
}

export interface Schreiber {
  doc: PDFDocument
  seite: PDFPage
  y: number
  text: (s: string, x: number, opt?: { groesse?: number; fett?: boolean; grau?: boolean; rechts?: boolean }) => void
  absatz: (s: string, opt?: { x?: number; breite?: number; groesse?: number }) => void
  angabe: (label: string, wert: string) => void
  titel: (s: string, unter?: string) => void
  zwischentitel: (s: string) => void
  linie: (dick?: boolean) => void
  platz: (hoehe: number) => void
  neueSeite: () => void
  bild: (bytes: ArrayBuffer, art: 'png' | 'jpg', x: number, maxB: number, maxH: number) => Promise<number>
}

/** Neues PDF mit Kopf (Logo, orange Linie) auf der ersten Seite. */
export async function neuesPdf(titel: string, sprache: 'de' | 'fr'): Promise<Schreiber> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(sicher(titel))
  doc.setAuthor('Dimension Solaire')
  const normal: PDFFont = await doc.embedFont(StandardFonts.Helvetica)
  const fett: PDFFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const farbe = (c: readonly [number, number, number]) => rgb(c[0], c[1], c[2])

  const s: Schreiber = {
    doc,
    seite: doc.addPage([BREITE, HOEHE]),
    y: HOEHE - 52,
    text(t, x, opt = {}) {
      const f = opt.fett ? fett : normal
      const g = opt.groesse ?? 9.5
      const t2 = sicher(t)
      const w = f.widthOfTextAtSize(t2, g)
      s.seite.drawText(t2, {
        x: opt.rechts ? x - w : x,
        y: s.y,
        size: g,
        font: f,
        color: farbe(opt.grau ? GRAU : NAVY),
      })
    },
    absatz(t, opt = {}) {
      const g = opt.groesse ?? 9.5
      const x = opt.x ?? RAND
      const breite = opt.breite ?? BREITE - RAND - x
      for (const roh of sicher(t).split('\n')) {
        let zeile = ''
        for (const wort of roh.split(' ')) {
          const probe = zeile ? `${zeile} ${wort}` : wort
          if (normal.widthOfTextAtSize(probe, g) > breite && zeile) {
            s.platz(g + 4)
            s.text(zeile, x, { groesse: g })
            s.y -= g + 4
            zeile = wort
          } else zeile = probe
        }
        s.platz(g + 4)
        s.text(zeile, x, { groesse: g })
        s.y -= g + 4
      }
    },
    angabe(label, wert) {
      s.platz(15)
      s.text(label, RAND, { grau: true })
      s.absatz(wert || '-', { x: 185 })
      s.y -= 2
    },
    titel(t, unter) {
      s.text(t, RAND, { groesse: 15, fett: true })
      s.y -= 16
      if (unter) {
        s.text(unter, RAND, { grau: true })
        s.y -= 14
      }
      s.y -= 10
    },
    zwischentitel(t) {
      s.platz(40)
      s.y -= 8
      s.text(t, RAND, { groesse: 11, fett: true })
      s.y -= 6
      s.linie()
    },
    linie(dick = false) {
      s.seite.drawLine({
        start: { x: RAND, y: s.y },
        end: { x: BREITE - RAND, y: s.y },
        thickness: dick ? 1.5 : 0.5,
        color: dick ? farbe(ORANGE) : rgb(0.835, 0.859, 0.89),
      })
      s.y -= 14
    },
    platz(hoehe) {
      if (s.y - hoehe < 60) s.neueSeite()
    },
    neueSeite() {
      s.seite = doc.addPage([BREITE, HOEHE])
      s.y = HOEHE - 60
    },
    async bild(bytes, art, x, maxB, maxH) {
      const b = art === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      const f = Math.min(maxB / b.width, maxH / b.height, 1)
      s.platz(b.height * f + 4)
      s.seite.drawImage(b, { x, y: s.y - b.height * f, width: b.width * f, height: b.height * f })
      return b.height * f
    },
  }

  try {
    const logo = await fetch(`./logo/logo-hell-${sprache}.png`).then((r) => (r.ok ? r.arrayBuffer() : null))
    if (logo) {
      const bild = await doc.embedPng(logo)
      s.seite.drawImage(bild, { x: RAND, y: s.y - 4, width: (bild.width / bild.height) * 30, height: 30 })
    }
  } catch {
    // Ohne Logo ist das Dokument trotzdem gültig.
  }
  s.y -= 14
  s.linie(true)
  s.y -= 8
  return s
}

/** PDF im Browser öffnen (Ansehen, Drucken, Teilen). */
export function pdfOeffnen(bytes: Uint8Array): void {
  const adresse = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  window.open(adresse, '_blank', 'noopener')
  setTimeout(() => {
    URL.revokeObjectURL(adresse)
  }, 60_000)
}
