import type { TFunction } from 'i18next'
import { formatChf, formatDatum } from '@/lib/format'
import { ibanPruefen } from '../lib/qr'
import { zeilenBetrag } from '../lib/rechnung'
import type { RechnungVoll } from '../types'
import { db } from './rechnungen'
import { sicher, zahlteilZeichnen } from './zahlteil'

/**
 * Rechnung oder Mahnung als PDF (A4) in der Sprache des Kunden, mit QR-Zahlteil, wenn die Firma eine
 * gültige IBAN hat. Rückfall zu AbaNinja (Entscheid 0009): dort entsteht die QR-Rechnung im Normalfall.
 * pdf-lib wird erst hier geladen, nicht mit der App.
 */

const NAVY = [0.063, 0.149, 0.247] as const
const GRAU = [0.353, 0.392, 0.451] as const
const ORANGE = [0.969, 0.576, 0.118] as const
const MM = 72 / 25.4

/** PDF-Bytes. mahnstufe > 0 macht eine Mahnung mit offener Summe und Mahnfrist. */
export async function rechnungPdf(r: RechnungVoll, t: TFunction, mahnstufe = 0): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const titel = mahnstufe
    ? t('rechnungen.pdf.mahnung', { stufe: mahnstufe, nummer: r.nummer ?? '' })
    : t('rechnungen.pdf.titel', { nummer: r.nummer ?? t('rechnungen.entwurf') })
  doc.setTitle(sicher(titel))
  doc.setAuthor(sicher(r.firma_daten.name))
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const fett = await doc.embedFont(StandardFonts.HelveticaBold)
  const farbe = (c: readonly [number, number, number]) => rgb(c[0], c[1], c[2])
  const f = r.firma_daten
  const iban = f.iban && ibanPruefen(f.iban) === 'ok' && r.status !== 'entwurf' ? f.iban : null
  const mitQr = iban !== null
  const unten = mitQr ? 105 * MM + 30 : 70
  let seite = doc.addPage([595.28, 841.89])
  let y = 790

  const text = (
    s: string,
    x: number,
    o: { groesse?: number; fett?: boolean; grau?: boolean; rechts?: boolean } = {},
  ) => {
    const schrift = o.fett ? fett : normal
    const g = o.groesse ?? 9.5
    const s2 = sicher(s)
    const breite = schrift.widthOfTextAtSize(s2, g)
    seite.drawText(s2, { x: o.rechts ? x - breite : x, y, size: g, font: schrift, color: farbe(o.grau ? GRAU : NAVY) })
  }
  const kuerzen = (s: string, max: number) => {
    let k = sicher(s)
    while (k.length > 3 && normal.widthOfTextAtSize(k, 9.5) > max) k = `${k.slice(0, -2)}…`.replace(/……$/, '…')
    return k
  }
  const linie = (dicke = 0.4, c = rgb(0.835, 0.859, 0.89)) => {
    seite.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: dicke, color: c })
  }

  try {
    const logo = await fetch(`./logo/logo-hell-${r.sprache}.png`).then((x) => (x.ok ? x.arrayBuffer() : null))
    if (logo) {
      const bild = await doc.embedPng(logo)
      seite.drawImage(bild, { x: 50, y: y - 4, width: (bild.width / bild.height) * 30, height: 30 })
    }
  } catch {
    // Ohne Logo ist die Rechnung trotzdem gültig.
  }
  y -= 14
  linie(1.5, farbe(ORANGE))
  y -= 14
  text(
    [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' '), f.telefon, f.email].filter(Boolean).join(' · '),
    50,
    {
      groesse: 7.5,
      grau: true,
    },
  )
  // Empfänger im Fenster rechts (Couvert C5/6 mit Fenster rechts)
  y = 700
  const e = r.empfaenger
  for (const [i, z] of [e.name, e.strasse, [e.plz, e.ort].filter(Boolean).join(' ')].filter(Boolean).entries()) {
    text(z ?? '', 330, { fett: i === 0 })
    y -= 13
  }
  y = 610
  text(titel, 50, { groesse: 15, fett: true })
  y -= 16
  text(r.titel, 50, { grau: true })
  y -= 22

  const angaben: [string, string][] = [
    [t('rechnungen.pdf.datum'), r.datum ? formatDatum(mahnstufe && r.gemahnt_am ? r.gemahnt_am : r.datum) : '–'],
    [
      t('rechnungen.pdf.faellig'),
      mahnstufe && r.mahnfrist ? formatDatum(r.mahnfrist) : r.faellig_am ? formatDatum(r.faellig_am) : '–',
    ],
    ...(r.kundennummer ? [[t('rechnungen.pdf.kundennummer'), String(r.kundennummer)] as [string, string]] : []),
    ...(r.projekt_nummer ? [[t('rechnungen.pdf.projekt'), r.projekt_nummer] as [string, string]] : []),
    ...(f.mwst_nr ? [[t('rechnungen.pdf.mwstNr'), f.mwst_nr] as [string, string]] : []),
  ]
  for (const [l, w] of angaben) {
    text(l, 50, { grau: true })
    text(w, 160)
    y -= 14
  }
  y -= 12

  if (mahnstufe) {
    text(
      t(`rechnungen.pdf.mahntext${String(Math.min(mahnstufe, 3))}`, {
        nummer: r.nummer,
        datum: r.datum ? formatDatum(r.datum) : '',
      }),
      50,
    )
    y -= 26
  }
  // Einheiten aus der Datenbank sind deutsch; bekannte erscheinen in der Sprache der Rechnung.
  const einheit = (e: string | undefined) => (e ? t(`rechnungen.einheit.${e}`, { defaultValue: e }) : '')
  const kopf = () => {
    text(t('rechnungen.pdf.bezeichnung'), 50, { fett: true })
    text(t('rechnungen.pdf.menge'), 380, { fett: true, rechts: true })
    text(t('rechnungen.pdf.preis'), 460, { fett: true, rechts: true })
    text(t('rechnungen.pdf.betrag'), 545, { fett: true, rechts: true })
    y -= 6
    linie(0.7, farbe(NAVY))
    y -= 14
  }
  kopf()
  for (const p of r.positionen) {
    if (y < unten + 90) {
      seite = doc.addPage([595.28, 841.89])
      y = 790
      kopf()
    }
    text(kuerzen(p.text, 270), 50)
    text(`${p.menge.toLocaleString('de-CH')} ${einheit(p.einheit)}`.trim(), 380, { rechts: true })
    text(formatChf(p.preis_rappen), 460, { rechts: true })
    text(formatChf(zeilenBetrag(p)), 545, { rechts: true })
    y -= 6
    linie()
    y -= 14
  }
  y -= 4
  const summe = (l: string, w: number, fettDruck = false) => {
    text(l, 460, { rechts: true, fett: fettDruck })
    text(formatChf(w, { mitWaehrung: fettDruck }), 545, { rechts: true, fett: fettDruck })
    y -= 14
  }
  const satz = r.mwst_satz.toLocaleString('de-CH')
  summe(t('rechnungen.pdf.netto'), r.netto_rappen)
  summe(t(r.inkl_mwst ? 'rechnungen.pdf.mwstInkl' : 'rechnungen.pdf.mwst', { satz }), r.mwst_rappen)
  summe(t('rechnungen.pdf.total'), r.total_rappen, true)
  if (r.bezahlt_rappen > 0) {
    summe(t('rechnungen.pdf.bezahlt'), -r.bezahlt_rappen)
    summe(t('rechnungen.pdf.offen'), r.total_rappen - r.bezahlt_rappen, true)
  }
  y -= 10
  if (!mitQr && f.iban) {
    text(t('rechnungen.pdf.bank', { bank: f.bank ?? '', iban: f.iban, nummer: r.nummer ?? '' }), 50)
    y -= 14
  }
  text(t('rechnungen.pdf.gruss'), 50)
  y -= 13
  text(f.name, 50, { fett: true })

  if (iban) {
    const letzte = seite
    await zahlteilZeichnen(letzte, { normal, fett }, t, {
      iban,
      glaeubiger: { name: f.name, strasse: f.strasse, plz: f.plz, ort: f.ort },
      schuldner: e.plz || e.ort ? { name: e.name, strasse: e.strasse, plz: e.plz, ort: e.ort } : null,
      betragRappen: r.total_rappen - r.bezahlt_rappen,
      mitteilung: t('rechnungen.pdf.titel', { nummer: r.nummer ?? '' }),
    })
  }
  return doc.save()
}

/** PDF hochladen und bei der Rechnung ablegen; gibt Dokument-ID und Dateiname zurück. */
export async function rechnungPdfAblegen(
  r: RechnungVoll,
  bytes: Uint8Array,
  mahnstufe = 0,
): Promise<{ id: string; name: string }> {
  const name = `${r.nummer ?? 'Entwurf'}${mahnstufe ? `-Mahnung-${String(mahnstufe)}` : ''}.pdf`
  const pfad = `rechnungen/${r.id}/${String(Date.now())}-${name}`
  const datei = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: 'application/pdf',
      bytes: bytes.byteLength,
      ordner: 'rechnungen',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'rechnungen',
      bezug_id: r.id,
    })
    .select('id')
    .single()
  if (error) throw error
  if (!mahnstufe) await db().from('rechnungen').update({ dokument_id: data.id }).eq('id', r.id)
  return { id: data.id, name }
}
