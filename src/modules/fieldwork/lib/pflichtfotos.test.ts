import { describe, expect, it } from 'vitest'
import { fehlendePflichtfotos, pflichtFuer } from './pflichtfotos'

const service = [
  { schluessel: 'vorher', de: 'Vorher', fr: 'Avant' },
  { schluessel: 'nachher', de: 'Nachher', fr: 'Après' },
]

describe('Pflichtfotos', () => {
  it('zeigt nur die fehlenden, Unterschrift und freie Fotos zählen nicht', () => {
    const bilder = [
      { ordner: 'fotos', kategorie: 'vorher' },
      { ordner: 'fotos', kategorie: null },
      { ordner: 'unterschrift', kategorie: 'nachher' },
    ]
    expect(fehlendePflichtfotos(service, bilder).map((p) => p.schluessel)).toEqual(['nachher'])
  })

  it('ohne Einstellung gibt es keine Pflicht', () => {
    expect(pflichtFuer(undefined, 'service')).toEqual([])
    expect(pflichtFuer({ service }, 'montage')).toEqual([])
  })
})
