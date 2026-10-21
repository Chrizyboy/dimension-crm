import { zeilenAusTextteilen, type Textteil } from './pdfZeilen'

/**
 * Liest den Text eines PDFs im Browser (pdf.js), Seite für Seite als Zeilen.
 * pdf.js wird erst beim ersten Gebrauch geladen, damit die App klein startet.
 * Höchstens 12 Seiten: Eturnity-Offerten haben die Zahlen vorne, danach folgen nur Datenblätter.
 */
export async function pdfZeilen(datei: Blob, maxSeiten = 12): Promise<string[]> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const aufgabe = pdfjs.getDocument({ data: new Uint8Array(await datei.arrayBuffer()) })
  const doc = await aufgabe.promise
  try {
    const zeilen: string[] = []
    for (let i = 1; i <= Math.min(doc.numPages, maxSeiten); i++) {
      const seite = await doc.getPage(i)
      const inhalt = await seite.getTextContent()
      zeilen.push(
        ...zeilenAusTextteilen(
          inhalt.items.flatMap((t): Textteil[] =>
            'str' in t ? [{ str: t.str, transform: t.transform as number[], hasEOL: t.hasEOL }] : [],
          ),
        ),
      )
    }
    return zeilen
  } finally {
    void aufgabe.destroy()
  }
}
