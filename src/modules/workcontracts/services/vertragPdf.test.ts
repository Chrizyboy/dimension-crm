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
})
