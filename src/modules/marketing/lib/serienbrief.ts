import { formatDatum } from '@/lib/format'
import type { Sprache, Zielkontakt } from '../types'
import { fuellen } from './zielgruppe'

/**
 * Serienbrief als ein PDF mit einem Brief je Empfänger (V233): Logo, Absenderzeile, Adresse im Fenster rechts
 * (Schweizer Norm C5/C4 rechts), Ort und Datum, Betreff fett, Text mit Platzhaltern in der Sprache des Kontakts.
 * pdf-lib wird erst hier geladen, nicht mit der App.
 */

const NAVY = [0.063, 0.149, 0.247] as const
const GRAU = [0.353, 0.392, 0.451] as const
const ORANGE = [0.969, 0.576, 0.118] as const
const MM = 72 / 25.4

/** Die Standardschrift kennt nur WinAnsi; andere Zeichen würden den PDF-Bau abbrechen. */
function sicher(text: string): string {
  return text
    .replace(/[\u2010-\u2013]/g, '-')
    .replace(/[^\n\u0020-\u007e\u00a0-\u00ff\u2018-\u201e\u2020\u2022\u2026\u20ac]/g, '')
}

/** Vorlage je Sprache für den Serienbrief. */
export interface BriefVorlage {
  absender: string
  ort: string
  betreff: string
  text: string
}

/** Fensteradresse: Firma, z. Hd., Name, Strasse, PLZ Ort. */
export function adressblock(k: Zielkontakt): string[] {
  const person = [k.vorname, k.nachname].filter(Boolean).join(' ')
  return [
    k.firma ?? '',
    k.firma && person ? person : !k.firma ? person || k.name : '',
    k.strasse ?? '',
    [k.plz, k.ort].filter(Boolean).join(' '),
  ]
    .map((z) => z.trim())
    .filter(Boolean)
}

/** PDF-Bytes aller Briefe. */
export async function serienbriefPdf(
  empfaenger: readonly Zielkontakt[],
  vorlagen: Record<Sprache, BriefVorlage>,
  unterschrift: string,
  heute = new Date(),
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle('Serienbrief')
  doc.setAuthor('Dimension Solaire')
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const fett = await doc.embedFont(StandardFonts.HelveticaBold)
  const farbe = (c: readonly [number, number, number]) => rgb(c[0], c[1], c[2])
  const logos: Partial<Record<Sprache, Awaited<ReturnType<typeof doc.embedPng>> | null>> = {}
  const logo = async (s: Sprache) => {
    if (!(s in logos)) {
      const roh = await fetch(`./logo/logo-hell-${s}.png`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null)
      logos[s] = roh ? await doc.embedPng(roh) : null
    }
    return logos[s] ?? null
  }

  for (const k of empfaenger) {
    const v = vorlagen[k.sprache]
    let seite = doc.addPage([595.28, 841.89])
    const zeile = (s: string, x: number, y: number, o: { groesse?: number; fett?: boolean; grau?: boolean } = {}) => {
      seite.drawText(sicher(s), {
        x,
        y,
        size: o.groesse ?? 10.5,
        font: o.fett ? fett : normal,
        color: farbe(o.grau ? GRAU : NAVY),
      })
    }
    const bild = await logo(k.sprache)
    if (bild)
      seite.drawImage(bild, { x: 25 * MM, y: 841.89 - 25 * MM, width: (bild.width / bild.height) * 30, height: 30 })
    seite.drawLine({
      start: { x: 25 * MM, y: 841.89 - 30 * MM },
      end: { x: 185 * MM, y: 841.89 - 30 * MM },
      thickness: 1.2,
      color: farbe(ORANGE),
    })

    // Fenster rechts: 118 mm von links, Absenderzeile klein über der Adresse
    const fx = 118 * MM
    let y = 841.89 - 52 * MM
    zeile(v.absender.split('\n').join(', '), fx, y, { groesse: 7, grau: true })
    y -= 16
    for (const z of adressblock(k)) {
      zeile(z, fx, y)
      y -= 13.5
    }
    y = 841.89 - 100 * MM
    zeile(`${v.ort}, ${formatDatum(heute)}`, fx, y)
    y -= 34
    zeile(fuellen(v.betreff, k, k.sprache, { absender: unterschrift }), 25 * MM, y, { fett: true, groesse: 11.5 })
    y -= 24

    const breite = 160 * MM
    const text = fuellen(v.text, k, k.sprache, { absender: unterschrift })
    for (const absatz of sicher(text).split('\n')) {
      const woerter = absatz.split(' ')
      let aktuell = ''
      const ausgeben = (s: string) => {
        if (y < 25 * MM) {
          seite = doc.addPage([595.28, 841.89])
          y = 841.89 - 25 * MM
        }
        seite.drawText(s, { x: 25 * MM, y, size: 10.5, font: normal, color: farbe(NAVY) })
        y -= 14.5
      }
      if (!absatz.trim()) {
        y -= 7
        continue
      }
      for (const w of woerter) {
        const probe = aktuell ? `${aktuell} ${w}` : w
        if (normal.widthOfTextAtSize(probe, 10.5) > breite && aktuell) {
          ausgeben(aktuell)
          aktuell = w
        } else aktuell = probe
      }
      if (aktuell) ausgeben(aktuell)
    }
  }
  return doc.save()
}
