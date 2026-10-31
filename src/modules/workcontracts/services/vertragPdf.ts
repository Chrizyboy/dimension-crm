import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib'
import { sicher } from '@/services/zahlteil'
import type { Teil, VertragInhalt } from '../lib/vertragInhalt'

/**
 * Werkvertrag als PDF nach der Vorlage Muri: schwarze Arial-ähnliche Schrift (Helvetica), Logo oben rechts auf
 * jeder Seite, Seitenzahl unten rechts, Unterschriftsfelder mit Rahmen und Schatten, AGB zweispaltig.
 * Masse wie im Original (Ränder 25/23 mm, Text 10.5 pt, AGB 8.6 pt). pdf-lib wird erst hier geladen.
 */

const MM = 72 / 25.4
const W = 595.28
const H = 841.89
const LR = 25 * MM
const BREITE = W - LR - 23 * MM
const OBEN = H - 28 * MM
const UNTEN = 22 * MM
const SP = (BREITE - 5 * MM) / 2
const AGB_OBEN = H - 36 * MM

interface Schriften {
  normal: PDFFont
  fett: PDFFont
}

/** Bricht Textteile in Zeilen der Breite `breite` um; ein Teil behält seine Schrift. */
function umbrechen(teile: Teil[], breite: number, groesse: number, s: Schriften): Teil[][] {
  const zeilen: Teil[][] = [[]]
  let x = 0
  for (const teil of teile) {
    const schrift = teil.fett ? s.fett : s.normal
    for (const wort of sicher(teil.text).split(/(\s+)/)) {
      if (!wort) continue
      const w = schrift.widthOfTextAtSize(wort, groesse)
      const zeile = zeilen[zeilen.length - 1] ?? []
      if (/^\s+$/.test(wort)) {
        if (zeile.length) {
          zeile.push({ text: ' ', ...(teil.fett ? { fett: true } : {}) })
          x += schrift.widthOfTextAtSize(' ', groesse)
        }
        continue
      }
      if (x + w > breite && zeile.length) {
        while (zeile.length && zeile[zeile.length - 1]?.text === ' ') zeile.pop()
        zeilen.push([])
        x = 0
      }
      zeilen[zeilen.length - 1]?.push({ text: wort, ...(teil.fett ? { fett: true } : {}) })
      x += w
    }
  }
  return zeilen
}

/** PDF-Bytes des Werkvertrags. */
export async function werkvertragPdf(v: VertragInhalt): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(sicher(`${v.titel} ${v.parteien}`))
  doc.setAuthor('Dimension Solaire')
  const s: Schriften = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    fett: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  const schwarz = rgb(0, 0, 0)
  let logo: PDFImage | null = null
  try {
    const roh = await fetch(`./logo/logo-hell-${v.sprache}.png`).then((x) => (x.ok ? x.arrayBuffer() : null))
    if (roh) logo = await doc.embedPng(new Uint8Array(roh))
  } catch {
    // Ohne Logo bleibt der Vertrag gültig.
  }

  let seite: PDFPage = doc.addPage([W, H])
  let y = OBEN

  const zeichne = (zeile: Teil[], x: number, groesse: number) => {
    let dx = x
    for (const t of zeile) {
      const schrift = t.fett ? s.fett : s.normal
      seite.drawText(t.text, { x: dx, y, size: groesse, font: schrift, color: schwarz })
      dx += schrift.widthOfTextAtSize(t.text, groesse)
    }
  }
  const neueSeite = (abstand = 0) => {
    seite = doc.addPage([W, H])
    y = OBEN - abstand
  }
  /** Absatz einspaltig; bricht bei Bedarf auf eine neue Seite um. */
  const absatz = (teile: Teil[], o: { x?: number; breite?: number; groesse?: number; abstand?: number } = {}) => {
    const g = o.groesse ?? 10.5
    const x = LR + (o.x ?? 0)
    for (const zeile of umbrechen(teile, o.breite ?? BREITE - (o.x ?? 0), g, s)) {
      if (y - g < UNTEN) neueSeite()
      y -= g
      zeichne(zeile, x, g)
      y -= 13 - g
    }
    y -= o.abstand ?? 0
  }
  const fett = (text: string, abstand = 0) => {
    absatz([{ text, fett: true }], { abstand })
  }
  const luecke = (mm: number) => {
    y -= mm * MM
  }
  /** Zeile «Bezeichnung | Wert» mit fester Spalte wie im Parteien-Kasten. */
  const zeileLabel = (label: string, wert: string) => {
    const start = y
    absatz([{ text: label }], { breite: 36 * MM })
    const nach = y
    y = start
    absatz([{ text: wert || ' ' }], { x: 37.4 * MM })
    y = Math.min(y, nach) - 6.5
  }
  /** Aufzählung mit Zeichen links (Nummer, Punkt oder «o»). */
  const punkt = (zeichen: string, teile: Teil[], einzug: number, zeichenX: number, nach: number) => {
    const start = y
    absatz(teile, { x: einzug })
    const ende = y
    y = start - 10.5
    seite.drawText(zeichen, { x: LR + zeichenX, y, size: 10.5, font: s.normal, color: schwarz })
    y = ende - nach
  }
  /** Kästchen zum Ankreuzen. */
  const kaestchen = (x: number, an: boolean) => {
    const k = 2.8 * MM
    seite.drawRectangle({ x, y: y - 0.5, width: k, height: k, borderColor: schwarz, borderWidth: 0.6 })
    if (an) {
      seite.drawLine({ start: { x, y: y - 0.5 }, end: { x: x + k, y: y - 0.5 + k }, thickness: 0.6, color: schwarz })
      seite.drawLine({ start: { x, y: y - 0.5 + k }, end: { x: x + k, y: y - 0.5 }, thickness: 0.6, color: schwarz })
    }
  }
  /** Unterschriftsfeld wie im Original: Rahmen mit Schatten, Name darunter. */
  const kasten = (label: string, labelBreite: number, o: { name?: string; breite?: number; x?: number } = {}) => {
    const x0 = LR + (o.x ?? 0)
    const bw = o.breite ?? 59 * MM
    const bh = 12.5 * MM
    const y0 = y - bh
    seite.drawText(sicher(label), { x: x0, y: y0 + 5 * MM, size: 10.5, font: s.normal, color: schwarz })
    seite.drawRectangle({
      x: x0 + labelBreite + 0.8,
      y: y0 - 0.8,
      width: bw,
      height: bh,
      color: rgb(0.333, 0.333, 0.333),
    })
    seite.drawRectangle({
      x: x0 + labelBreite,
      y: y0,
      width: bw,
      height: bh,
      color: rgb(1, 1, 1),
      borderColor: schwarz,
      borderWidth: 0.8,
    })
    y = y0
    if (o.name) {
      y -= 5 * MM
      seite.drawText(sicher(o.name), { x: x0 + labelBreite, y, size: 9, font: s.normal, color: schwarz })
    }
  }
  /** Betragszeile mit Punkt links und «(inkl. MWST)» rechts. */
  const betrag = (teile: Teil[]) => {
    const start = y
    punkt('•', teile, 12.7 * MM, 6 * MM, 4)
    const ende = y
    y = start - 10.5
    const breite = s.fett.widthOfTextAtSize(sicher(v.mwst), 10.5)
    seite.drawText(sicher(v.mwst), { x: LR + BREITE - breite, y, size: 10.5, font: s.fett, color: schwarz })
    y = ende
  }

  // Seite 1: Parteien und Vertragsgegenstand
  luecke(12)
  fett(v.titel)
  luecke(2.5)
  absatz([{ text: v.parteien }])
  luecke(2.5)
  absatz([{ text: v.gegenstand }])
  luecke(12)
  fett(v.kundeTitel)
  luecke(2.5)
  for (const [l, w] of v.kunde) zeileLabel(l, w)
  luecke(5)
  fett(v.unternehmerTitel)
  luecke(2.5)
  for (const [l, w] of v.unternehmer) zeileLabel(l, w)
  luecke(4)
  fett(v.abschnitt1)
  luecke(1.5)
  absatz(v.einleitung)
  luecke(5)
  absatz([{ text: v.leistungenTitel }])
  luecke(4)
  ;[...v.leistungen, [{ text: v.optionenTitel }]].forEach((teile, i) => {
    punkt(`${String(i + 1)}.`, teile, 12.7 * MM, 6 * MM, 3.2)
  })
  for (const o of v.optionen) {
    if (y - 10.5 < UNTEN) neueSeite()
    const start = y
    seite.drawText('o', { x: LR + 20 * MM, y: y - 10.5, size: 10.5, font: s.normal, color: schwarz })
    y -= 10.5
    kaestchen(LR + 25.5 * MM, o.an)
    y = start
    absatz([{ text: o.text }], { x: 30 * MM })
    y -= 3.6
  }

  // Seite 2: Termine, Werklohn, Unterschriften
  neueSeite(15 * MM)
  fett(v.abschnitt2)
  luecke(2)
  for (const [l, w] of v.termine) punkt('•', [{ text: `${l} `, fett: true }, { text: w }], 12.7 * MM, 6 * MM, 1)
  absatz([{ text: v.terminHinweis }], { x: 12.7 * MM })
  luecke(7)
  fett(v.abschnitt3)
  luecke(2)
  absatz([{ text: v.werklohnIntro }])
  luecke(2)
  betrag([{ text: `${v.total[0]} ${v.total[1]}`, fett: true }])
  luecke(5)
  absatz([{ text: v.planTitel }])
  luecke(2)
  for (const [l, w] of v.raten) betrag([{ text: `${l} ` }, { text: w, fett: true }])
  if (y - 75 * MM < UNTEN) neueSeite()
  luecke(30)
  const reihe = y
  absatz([{ text: v.ortDatum }])
  y = reihe
  absatz([{ text: v.name }], { x: 62.5 * MM })
  luecke(8)
  kasten(v.unterschrift, 23.5 * MM)
  luecke(20)
  absatz([{ text: v.firmaOrtDatum }])
  luecke(6)
  kasten(v.firmaUnterschrift, 57.5 * MM, { name: v.unterzeichner })

  // AGB zweispaltig
  neueSeite()
  let spalte = 0
  y = AGB_OBEN
  const g = 8.6
  const zeilenAbstand = 10.2
  const spalteX = () => LR + spalte * (SP + 5 * MM)
  const weiter = () => {
    if (spalte === 0) spalte = 1
    else {
      seite = doc.addPage([W, H])
      spalte = 0
    }
    y = AGB_OBEN
  }
  const agbAbsatz = (teile: Teil[], o: { vorher?: number; nachher?: number; groesse?: number; dazu?: number } = {}) => {
    const gr = o.groesse ?? g
    const zeilen = umbrechen(teile, SP, gr, s)
    // «dazu»: so viele Zeilen des folgenden Absatzes müssen noch in dieselbe Spalte passen.
    const noetig = (o.vorher ?? 0) + (zeilen.length + (o.dazu ?? 0)) * zeilenAbstand
    if (y - noetig < UNTEN) weiter()
    else y -= o.vorher ?? 0
    for (const zeile of zeilen) {
      if (y - zeilenAbstand < UNTEN) weiter()
      y -= gr
      zeichne(zeile, spalteX(), gr)
      y -= zeilenAbstand - gr
    }
    y -= o.nachher ?? 2
  }
  agbAbsatz([{ text: v.agbTitel, fett: true }], { groesse: 9.5, nachher: 10 })
  for (const [titel, absaetze] of v.agb) {
    const [nr, ...rest] = titel.split(' ')
    // Titel mit bis zu drei Zeilen des ersten Absatzes zusammenhalten, damit er nie allein unten steht.
    const erste = umbrechen([{ text: absaetze[0] ?? '' }], SP, g, s).length
    agbAbsatz(
      [
        {
          text: `${(nr ?? '').replace(/\.$/, '')}       ${rest.join(' ')}${v.sprache === 'fr' ? ' :' : ':'}`,
          fett: true,
        },
      ],
      {
        vorher: 9,
        dazu: Math.min(erste, 3),
      },
    )
    for (const a of absaetze) agbAbsatz([{ text: a }])
  }
  if (y - 55 * MM < UNTEN) weiter()
  agbAbsatz([{ text: v.unterschrift.replace(/\s*:$/, v.sprache === 'fr' ? ' :' : ':'), fett: true }], { vorher: 9 })
  agbAbsatz([{ text: v.agbSchluss }])
  y -= 8 * MM
  const x0 = spalteX() - LR
  const reiheAgb = y
  absatz([{ text: v.ortDatum }], { x: x0, breite: 44 * MM })
  y = reiheAgb
  absatz([{ text: v.name }], { x: x0 + 45 * MM, breite: SP - 45 * MM })
  y -= 8 * MM
  kasten(v.unterschrift, 21 * MM, { breite: SP - 22 * MM, x: x0 })

  // Kopf und Fuss auf jeder Seite
  doc.getPages().forEach((p, i) => {
    if (logo) {
      const h = 14 * MM
      const b = Math.min(79 * MM, (logo.width / logo.height) * h)
      p.drawImage(logo, { x: W - 23 * MM - b, y: H - 11.5 * MM - h, width: b, height: h })
    }
    const nr = String(i + 1)
    p.drawText(nr, {
      x: W - 23 * MM - s.normal.widthOfTextAtSize(nr, 10),
      y: 13 * MM,
      size: 10,
      font: s.normal,
      color: schwarz,
    })
  })
  return doc.save()
}
