import { describe, expect, it } from 'vitest'
import { MAX_ANHAENGE, bildschirmfotoName, dateienAus, erlaubt, hinzufuegen, istBild } from './anhaenge'

const datei = (name: string, type = 'image/png', size = 1000) => new File([new Uint8Array(size)], name, { type })

describe('Anhänge an Meldungen', () => {
  it('nimmt Bilder und PDF, aber keine anderen oder zu grossen Dateien', () => {
    expect(erlaubt(datei('a.png'))).toBe(true)
    expect(erlaubt(datei('a.pdf', 'application/pdf'))).toBe(true)
    expect(erlaubt(datei('a.exe', 'application/x-msdownload'))).toBe(false)
    expect(erlaubt({ type: 'image/jpeg', size: 25 * 1024 * 1024 })).toBe(false)
  })

  it('zeigt HEIC nicht als Vorschau (Browser können es nicht)', () => {
    expect(istBild('image/jpeg')).toBe(true)
    expect(istBild('image/heic')).toBe(false)
    expect(istBild(null)).toBe(false)
  })

  it('lässt Doppelte weg und hält die Höchstzahl ein', () => {
    const a = datei('a.png')
    const r1 = hinzufuegen([a], [datei('a.png'), datei('b.png')])
    expect(r1.dateien.map((d) => d.name)).toEqual(['a.png', 'b.png'])
    expect(r1.abgelehnt).toBe(0)
    const viele = Array.from({ length: MAX_ANHAENGE + 2 }, (_, i) => datei(`${String(i)}.png`))
    const r2 = hinzufuegen([], viele)
    expect(r2.dateien).toHaveLength(MAX_ANHAENGE)
    expect(r2.abgelehnt).toBe(2)
  })

  it('benennt eingefügte Bildschirmfotos mit Datum und Uhrzeit', () => {
    const jetzt = new Date(2026, 10, 3, 16, 42)
    expect(bildschirmfotoName(jetzt, 1, 'image/png')).toBe('Bildschirmfoto 03.11.2026 16-42.png')
    expect(bildschirmfotoName(jetzt, 2, 'image/jpeg')).toBe('Bildschirmfoto 03.11.2026 16-42 (2).jpg')
  })

  it('holt Bilder aus der Zwischenablage, Text bleibt aussen vor', () => {
    const jetzt = new Date(2026, 10, 3, 9, 5)
    const zwischenablage = {
      files: [datei('image.png'), datei('foto.jpg', 'image/jpeg')],
      items: [],
    } as unknown as DataTransfer
    expect(dateienAus(zwischenablage, jetzt).map((f) => f.name)).toEqual([
      'Bildschirmfoto 03.11.2026 09-05.png',
      'foto.jpg',
    ])
    expect(dateienAus({ files: [], items: [{ kind: 'string' }] } as unknown as DataTransfer)).toEqual([])
    expect(dateienAus(null)).toEqual([])
  })
})
