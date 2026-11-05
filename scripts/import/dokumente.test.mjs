import { describe, expect, it } from 'vitest'
import { webAdresse } from './schritte/dokumente.mjs'

describe('SharePoint-Adresse aus der Vorlage', () => {
  it('macht aus dem Pfad eine Web-Adresse der Bibliothek «Public»', () => {
    expect(webAdresse('MURI/2. DEVIS - OFFERTE/200001 - Dantas/Plan.pdf')).toBe(
      'https://dimensionsolaire.sharepoint.com/sites/Dimension-Solaire/Public/MURI/2.%20DEVIS%20-%20OFFERTE/200001%20-%20Dantas/Plan.pdf',
    )
  })
  it('kodiert Zeichen, an denen der Browser die Adresse abschneidet', () => {
    expect(webAdresse('A/50% #1?.pdf')).toBe(
      'https://dimensionsolaire.sharepoint.com/sites/Dimension-Solaire/Public/A/50%25%20%231%3F.pdf',
    )
  })
  it('ohne Pfad keine Adresse', () => {
    expect(webAdresse(null)).toBeNull()
  })
})
