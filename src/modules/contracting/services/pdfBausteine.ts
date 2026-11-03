import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib'
import type { Absender } from './dokumente'

/**
 * Gemeinsame Bausteine für Potenzialanalyse und Dossier (A4, Schrift Helvetica, Farben der Firma wie Bestellung und
 * Werkvertrag). pdf-lib wird erst beim Erstellen geladen, nicht mit der App.
 */

const NAVY = [0.063, 0.149, 0.247] as const
const GRAU = [0.353, 0.392, 0.451] as const
const ORANGE = [0.969, 0.576, 0.118] as const
const GRUEN = [0.098, 0.451, 0.255] as const

/** Die Standardschrift kennt nur WinAnsi; andere Zeichen würden den PDF-Bau abbrechen. */
export function sicher(text: string): string {
  return text
    .replace(/[\u2010-\u2013]/g, '-')
    .replace(/[^\u0020-\u007e\u00a0-\u00ff\u2018-\u201e\u2020\u2022\u2026\u20ac]/g, '?')
}

export interface TextArt {
  groesse?: number
  fett?: boolean
  grau?: boolean
  gruen?: boolean
  rechts?: boolean
}

/** Schreiber mit Zeilen-Position, der bei Bedarf eine neue Seite beginnt. */
export interface Schreiber {
  doc: PDFDocument
  seite: PDFPage
  y: number
  text: (s: string, x: number, art?: TextArt) => void
  /** Text mit Umbruch auf die Breite; rückt y nach jeder Zeile vor. */
  absatz: (s: string, x: number, breite: number, art?: TextArt) => void
  /** Überschrift eines Abschnitts mit Linie. */
  abschnitt: (s: string) => void
  /** Beschriftung links, Wert rechts. */
  zeile: (label: string, wert: string, art?: TextArt) => void
  /** Platz für h Punkte sicherstellen, sonst neue Seite. */
  platz: (h: number) => void
  linie: (farbe?: 'orange' | 'grau') => void
}

/** Neues A4-Dokument mit Logo in der Sprache und oranger Linie. */
export async function neuesPdf(titel: string, sprache: 'de' | 'fr', absender: Absender): Promise<Schreiber> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(sicher(titel))
  doc.setAuthor(sicher(absender.firma))
  const normal: PDFFont = await doc.embedFont(StandardFonts.Helvetica)
  const fett: PDFFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const farbe = (c: readonly [number, number, number]) => rgb(c[0], c[1], c[2])

  const s: Schreiber = {
    doc,
    seite: doc.addPage([595.28, 841.89]),
    y: 790,
    text(t, x, art = {}) {
      const f = art.fett ? fett : normal
      const g = art.groesse ?? 9.5
      const t2 = sicher(t)
      const b = f.widthOfTextAtSize(t2, g)
      const c = art.grau ? GRAU : art.gruen ? GRUEN : NAVY
      s.seite.drawText(t2, { x: art.rechts ? x - b : x, y: s.y, size: g, font: f, color: farbe(c) })
    },
    absatz(t, x, breite, art = {}) {
      const f = art.fett ? fett : normal
      const g = art.groesse ?? 9.5
      for (const roh of t.split('\n')) {
        let zeile = ''
        for (const wort of sicher(roh).split(' ')) {
          const probe = zeile ? `${zeile} ${wort}` : wort
          if (f.widthOfTextAtSize(probe, g) > breite && zeile) {
            s.platz(g + 4)
            s.text(zeile, x, art)
            s.y -= g + 3.5
            zeile = wort
          } else zeile = probe
        }
        s.platz(g + 4)
        s.text(zeile, x, art)
        s.y -= g + 3.5
      }
    },
    abschnitt(t) {
      s.platz(60)
      s.y -= 10
      s.text(t, 50, { groesse: 11.5, fett: true })
      s.y -= 6
      s.linie('grau')
      s.y -= 14
    },
    zeile(label, wert, art = {}) {
      s.platz(14)
      s.text(label, 50, { grau: !art.fett, ...(art.fett ? { fett: true } : {}) })
      s.text(wert, 545, { rechts: true, ...art })
      s.y -= 14
    },
    platz(h) {
      if (s.y - h < 70) {
        s.seite = doc.addPage([595.28, 841.89])
        s.y = 790
      }
    },
    linie(f = 'orange') {
      s.seite.drawLine({
        start: { x: 50, y: s.y },
        end: { x: 545, y: s.y },
        thickness: f === 'orange' ? 1.5 : 0.5,
        color: farbe(f === 'orange' ? ORANGE : GRAU),
      })
    },
  }

  try {
    const logo = await fetch(`./logo/logo-hell-${sprache}.png`).then((r) => (r.ok ? r.arrayBuffer() : null))
    if (logo) {
      const bild = await doc.embedPng(logo)
      const h = 30
      s.seite.drawImage(bild, { x: 50, y: s.y - 4, width: (bild.width / bild.height) * h, height: h })
    }
  } catch {
    // Ohne Logo ist das Dokument trotzdem brauchbar.
  }
  s.y -= 14
  s.linie()
  s.y -= 26
  return s
}

/** Fuss mit Absender auf jeder Seite (Firma, Adresse, Telefon, Mail). */
export function fuss(s: Schreiber, a: Absender): void {
  const text = sicher(
    [a.firma, a.strasse, [a.plz, a.ort].filter(Boolean).join(' '), a.telefon, a.email].filter(Boolean).join(' · '),
  )
  for (const seite of s.doc.getPages()) {
    const alt = s.seite
    const y = s.y
    s.seite = seite
    s.y = 40
    s.text(text, 50, { groesse: 7.5, grau: true })
    s.seite = alt
    s.y = y
  }
}
