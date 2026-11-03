import qrcode from 'qrcode-generator'
import { BOGEN, platz, type Etikett } from '../lib/etikett'

const MM = 72 / 25.4
const NAVY = [0.043, 0.122, 0.227] as const

/** Nur Zeichen, die die Standardschrift des PDF kennt (sonst bricht pdf-lib ab). */
function sicher(text: string): string {
  return text.replace(/[\u2010-\u2013]/g, '-').replace(/[^\u0020-\u007e\u00a1-\u00ff]/g, '')
}

/**
 * QR-Etiketten als PDF (A4, 3 × 8). Links der Code zur Akte, rechts Bezeichnung und Nummer. pdf-lib wird erst
 * hier geladen, damit es die Startseite nicht schwerer macht.
 */
export async function etikettenPdf(etiketten: readonly Etikett[], fusszeile: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle('QR-Etiketten')
  doc.setAuthor('Dimension Solaire')
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const fett = await doc.embedFont(StandardFonts.HelveticaBold)
  const farbe = rgb(NAVY[0], NAVY[1], NAVY[2])
  const seiten: ReturnType<typeof doc.addPage>[] = []
  const qrMm = 27
  const textBreite = (BOGEN.breiteMm - qrMm - 9) * MM

  // Zu langen Text kürzen statt über das Etikett hinaus schreiben.
  const passend = (s: string, font: typeof normal, groesse: number) => {
    const ganz = sicher(s)
    if (font.widthOfTextAtSize(ganz, groesse) <= textBreite) return ganz
    let x = ganz
    while (x.length > 1 && font.widthOfTextAtSize(`${x}...`, groesse) > textBreite) x = x.slice(0, -1)
    return `${x.trimEnd()}...`
  }

  etiketten.forEach((e, i) => {
    const p = platz(i)
    while (seiten.length <= p.seite) seiten.push(doc.addPage([210 * MM, 297 * MM]))
    const seite = seiten[p.seite]
    if (!seite) return
    const links = p.xMm * MM
    const unten = (297 - p.yMm - BOGEN.hoeheMm) * MM
    const q = qrcode(0, 'M')
    q.addData(e.link)
    q.make()
    const n = q.getModuleCount()
    const kaestchen = (qrMm * MM) / n
    const qx = links + 4 * MM
    const qy = unten + ((BOGEN.hoeheMm - qrMm) / 2) * MM
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (q.isDark(r, c))
          seite.drawRectangle({
            x: qx + c * kaestchen,
            y: qy + (n - 1 - r) * kaestchen,
            width: kaestchen,
            height: kaestchen,
            color: farbe,
          })
    const tx = qx + (qrMm + 3) * MM
    const mitte = unten + (BOGEN.hoeheMm / 2) * MM
    // Titel auf höchstens zwei Zeilen umbrechen, damit lange Gerätenamen lesbar bleiben.
    const woerter = sicher(e.titel).split(' ')
    let erste = ''
    while (woerter.length && fett.widthOfTextAtSize(`${erste} ${woerter[0] ?? ''}`.trim(), 10) <= textBreite)
      erste = `${erste} ${woerter.shift() ?? ''}`.trim()
    const zweite = woerter.join(' ')
    const zeilen = erste ? [erste, zweite].filter(Boolean) : [passend(zweite, fett, 10)]
    zeilen.slice(0, 2).forEach((z, j) => {
      seite.drawText(passend(z, fett, 10), { x: tx, y: mitte + 10 - j * 12, size: 10, font: fett, color: farbe })
    })
    if (e.nummer)
      seite.drawText(passend(e.nummer, normal, 9), {
        x: tx,
        y: mitte - 6 - (zeilen.length > 1 ? 8 : 0),
        size: 9,
        font: normal,
        color: farbe,
      })
    seite.drawText(passend(fusszeile, normal, 6.5), { x: tx, y: qy + 2, size: 6.5, font: normal, color: farbe })
  })
  if (seiten.length === 0) doc.addPage([210 * MM, 297 * MM])
  return doc.save()
}
