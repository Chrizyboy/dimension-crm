import { describe, expect, it } from 'vitest'
import { eindeutigeNamen, vorschauArt } from './datei'

describe('eindeutigeNamen', () => {
  it('nummeriert gleiche Namen vor der Endung', () => {
    expect(eindeutigeNamen(['Plan.pdf', 'plan.pdf', 'Foto', 'Foto', 'Plan.pdf'])).toEqual([
      'Plan.pdf',
      'plan (2).pdf',
      'Foto',
      'Foto (2)',
      'Plan (3).pdf',
    ])
  })
  it('ersetzt Zeichen, die Windows im Namen nicht erlaubt', () => {
    expect(eindeutigeNamen(['a/b:c.pdf', ''])).toEqual(['a_b_c.pdf', 'Datei'])
  })
})

describe('vorschauArt', () => {
  it('erkennt PDF und Bilder an Typ oder Endung', () => {
    expect(vorschauArt({ name: 'x', mime_typ: 'application/pdf' })).toBe('pdf')
    expect(vorschauArt({ name: 'Dach.JPG' })).toBe('bild')
    expect(vorschauArt({ name: 'IMG_1.heic', mime_typ: 'image/heic' })).toBe('andere')
    expect(vorschauArt({ name: 'Liste.xlsx' })).toBe('andere')
  })
})
