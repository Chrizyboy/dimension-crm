import type { TFunction } from 'i18next'
import { formatDatum } from '@/lib/format'
import type { Bestellung, Position } from '../types'
import { db } from './bestellungen'

/**
 * Bestellung als PDF (A4) in der Sprache des Lieferanten, abgelegt bei den Dokumenten der Bestellung,
 * damit sie als Anhang über den Ausgangskorb geht. pdf-lib wird erst hier geladen, nicht mit der App.
 */

const NAVY = [0.063, 0.149, 0.247] as const
const GRAU = [0.353, 0.392, 0.451] as const
const ORANGE = [0.969, 0.576, 0.118] as const

/** Die Standardschrift kennt nur WinAnsi; andere Zeichen würden den PDF-Bau abbrechen. */
function sicher(text: string): string {
  return text
    .replace(/[\u2010-\u2013]/g, '-')
    .replace(/[^\u0020-\u007e\u00a0-\u00ff\u2018-\u201e\u2020\u2022\u2026\u20ac]/g, '?')
}

/** PDF-Bytes der Bestellung. */
export async function bestellPdf(b: Bestellung, positionen: Position[], t: TFunction): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(sicher(t('einkauf.pdf.titel', { nummer: b.nummer })))
  doc.setAuthor(sicher(b.firma ?? 'Dimension Solaire'))
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const fett = await doc.embedFont(StandardFonts.HelveticaBold)
  const farbe = (c: readonly [number, number, number]) => rgb(c[0], c[1], c[2])
  let seite = doc.addPage([595.28, 841.89])
  let y = 790

  const text = (
    s: string,
    x: number,
    opt: { groesse?: number; fett?: boolean; grau?: boolean; rechts?: boolean } = {},
  ) => {
    const f = opt.fett ? fett : normal
    const g = opt.groesse ?? 9.5
    const s2 = sicher(s)
    const breite = f.widthOfTextAtSize(s2, g)
    seite.drawText(s2, { x: opt.rechts ? x - breite : x, y, size: g, font: f, color: farbe(opt.grau ? GRAU : NAVY) })
  }
  const kuerzen = (s: string, max: number) => {
    let r = sicher(s)
    while (r.length > 3 && normal.widthOfTextAtSize(r, 9.5) > max) r = `${r.slice(0, -2)}…`.replace(/……$/, '…')
    return r
  }

  try {
    const logo = await fetch(`./logo/logo-hell-${b.lieferant_sprache}.png`).then((r) => (r.ok ? r.arrayBuffer() : null))
    if (logo) {
      const bild = await doc.embedPng(logo)
      const h = 30
      seite.drawImage(bild, { x: 50, y: y - 4, width: (bild.width / bild.height) * h, height: h })
    }
  } catch {
    // Ohne Logo ist die Bestellung trotzdem gültig.
  }
  y -= 14
  seite.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1.5, color: farbe(ORANGE) })
  y -= 22

  const firma = [b.firma, b.firma_strasse, [b.firma_plz, b.firma_ort].filter(Boolean).join(' ')].filter(Boolean)
  const lieferant = [b.lieferant, b.email_bestellung].filter(Boolean)
  for (let i = 0; i < Math.max(firma.length, lieferant.length); i++) {
    text(firma[i] ?? '', 50)
    text(lieferant[i] ?? '', 545, { rechts: true, fett: i === 0 })
    y -= 13
  }
  y -= 20
  text(t('einkauf.pdf.titel', { nummer: b.nummer }), 50, { groesse: 15, fett: true })
  y -= 16
  text(formatDatum(new Date()), 50, { grau: true })
  y -= 24

  const ziel = b.lagerort_id
    ? [b.lagerort, b.lagerort_adresse]
    : [t('einkauf.pdf.baustelle'), b.objekt_strasse, [b.objekt_plz, b.objekt_ort].filter(Boolean).join(' ')]
  const angaben: [string, string][] = [
    [t('einkauf.pdf.lieferadresse'), ziel.filter(Boolean).join(', ')],
    [t('einkauf.pdf.liefertermin'), b.liefertermin ? formatDatum(b.liefertermin) : t('einkauf.pdf.baldmoeglichst')],
    ...(b.projekt_nummer ? [[t('einkauf.pdf.referenz'), b.projekt_nummer] as [string, string]] : []),
    ...(b.kundennummer_bei_lieferant
      ? [[t('einkauf.pdf.kundennummer'), b.kundennummer_bei_lieferant] as [string, string]]
      : []),
  ]
  for (const [l, w] of angaben) {
    text(l, 50, { grau: true })
    text(kuerzen(w, 360), 185)
    y -= 15
  }
  y -= 14

  const kopf = () => {
    text(t('einkauf.pdf.pos'), 50, { fett: true })
    text(t('einkauf.pdf.artikelnummer'), 80, { fett: true })
    text(t('einkauf.pdf.bezeichnung'), 175, { fett: true })
    text(t('einkauf.pdf.menge'), 545, { fett: true, rechts: true })
    y -= 6
    seite.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.7, color: farbe(NAVY) })
    y -= 14
  }
  kopf()
  positionen.forEach((p, i) => {
    if (y < 90) {
      seite = doc.addPage([595.28, 841.89])
      y = 790
      kopf()
    }
    text(String(i + 1), 50)
    text(kuerzen(p.artikelnummer ?? '', 90), 80)
    text(kuerzen(p.bezeichnung, 290), 175)
    text(`${p.menge.toLocaleString('de-CH')} ${p.einheit}`, 545, { rechts: true })
    y -= 6
    seite.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.4, color: rgb(0.835, 0.859, 0.89) })
    y -= 14
  })
  y -= 10
  if (b.notiz) {
    for (const zeile of b.notiz.split('\n').slice(0, 6)) {
      text(kuerzen(zeile, 495), 50)
      y -= 13
    }
    y -= 8
  }
  text(t('einkauf.pdf.bitte'), 50)
  y -= 22
  text(t('einkauf.pdf.gruss'), 50)
  y -= 13
  text(b.firma ?? 'Dimension Solaire', 50, { fett: true })
  return doc.save()
}

/** PDF hochladen und als Dokument der Bestellung ablegen; gibt Dokument-ID und Dateiname zurück. */
export async function bestellPdfAblegen(b: Bestellung, bytes: Uint8Array): Promise<{ id: string; name: string }> {
  const name = `${b.nummer}.pdf`
  const pfad = `einkauf/${b.id}/${String(Date.now())}-${name}`
  const datei = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: 'application/pdf',
      bytes: bytes.byteLength,
      ordner: 'einkauf',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'bestellungen',
      bezug_id: b.id,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, name }
}
