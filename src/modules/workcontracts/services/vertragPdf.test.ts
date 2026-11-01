import { describe, expect, it } from 'vitest'
import { BEISPIEL, EINSTELLUNG } from '../lib/vertragInhalt.test'
import { vertragInhalt } from '../lib/vertragInhalt'
import { werkvertragPdf } from './vertragPdf'

describe('Werkvertrag-PDF', () => {
  it('erstellt Vertrag und AGB auf Deutsch und Französisch', async () => {
    for (const sprache of ['de', 'fr'] as const) {
      const bytes = await werkvertragPdf(vertragInhalt({ ...BEISPIEL, sprache }, EINSTELLUNG))
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.load(bytes)
      // Seite 1 Parteien, Seite 2 Werklohn, danach die AGB (zweispaltig, zwei Seiten)
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(4)
      expect(doc.getPageCount()).toBeLessThanOrEqual(5)
    }
  })

  it('setzt die eigene Unterschrift in den Kasten', async () => {
    // 1×1-PNG genügt: geprüft wird, dass das Bild eingebettet wird.
    const png = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
      (c) => c.charCodeAt(0),
    )
    const ohne = await werkvertragPdf(vertragInhalt(BEISPIEL, EINSTELLUNG))
    const mit = await werkvertragPdf({ ...vertragInhalt(BEISPIEL, EINSTELLUNG), unterschriftBild: png })
    expect(mit.byteLength).toBeGreaterThan(ohne.byteLength)
  })
})
