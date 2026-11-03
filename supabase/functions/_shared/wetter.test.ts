import { describe, expect, it } from 'vitest'
import { alsDatum, leseCsv, MeteoSchweiz, neuesteDateien, punkteFuerPlz, wetterHolen } from './wetter.ts'

// Dateien im Aufbau der lokalen Prognose von MeteoSwiss (Strichpunkt, Kopfzeile), mit erfundenen Werten.
const META = [
  'point_id;point_type_id;station_abbr;postal_code;point_name',
  '48;1;MUR;5630;Muri AG (Station)',
  '563000;2;;5630;Muri AG',
  '163000;2;;1630;Bulle',
  '800100;2;;8001;Zürich',
].join('\n')

const TMAX = [
  'point_id;point_type_id;Date;tre200dx',
  '563000;2;202611030000;11.4',
  '563000;2;202611040000;8.0',
  '163000;2;202611030000;9.2',
  '800100;2;202611030000;12.0',
].join('\r\n')
const REGEN = ['point_id;point_type_id;Date;rka150d0', '563000;2;202611030000;0.0', '563000;2;202611040000;7.5'].join(
  '\n',
)

/** Ersatz für data.geo.admin.ch: Sammlung, Läufe, Dateien. */
class Ersatz extends MeteoSchweiz {
  geholt: string[] = []
  override punktTabelle() {
    return Promise.resolve('https://x/meta_point.csv')
  }
  override laeufe() {
    return Promise.resolve([
      { id: '20261103-ch', assets: { a: { href: 'https://x/vnut12.lssw.202611030700.tre200dx.csv' } } },
      {
        id: '20261103-ch-b',
        assets: {
          b: { href: 'https://x/vnut12.lssw.202611030800.tre200dx.csv' },
          c: { href: 'https://x/vnut12.lssw.202611030800.rka150d0.csv' },
        },
      },
    ])
  }
  override text(url: string) {
    this.geholt.push(url)
    if (url.endsWith('meta_point.csv')) return Promise.resolve(META)
    if (url.includes('tre200dx')) return Promise.resolve(TMAX)
    return Promise.resolve(REGEN)
  }
}

describe('Wetter (MeteoSwiss Open Data)', () => {
  it('liest CSV und Datum', () => {
    expect(leseCsv('﻿a;B\n1;2\n\n')).toEqual([{ a: '1', b: '2' }])
    expect(alsDatum('202611030000')).toBe('2026-11-03')
    expect(alsDatum('2026-11-03T00:00:00Z')).toBe('2026-11-03')
    expect(alsDatum('-')).toBeNull()
  })

  it('nimmt den Punkt der Postleitzahl, nicht die Station', () => {
    const p = punkteFuerPlz(leseCsv(META), ['5630', '1630', '9999'])
    expect(p.get('5630')).toBe('563000')
    expect(p.get('1630')).toBe('163000')
    expect(p.has('9999')).toBe(false)
  })

  it('wählt je Parameter den neuesten Lauf', () => {
    const items = [
      { id: 'a', assets: { x: { href: 'h/vnut12.lssw.202611030700.tre200dx.csv' } } },
      { id: 'b', assets: { y: { href: 'h/vnut12.lssw.202611030800.tre200dx.csv' } } },
    ]
    expect(neuesteDateien(items, ['tre200dx', 'rka150d0'])).toEqual(
      new Map([['tre200dx', 'h/vnut12.lssw.202611030800.tre200dx.csv']]),
    )
  })

  it('holt nur unsere Postleitzahlen und meldet fehlende Parameter', async () => {
    const m = new Ersatz()
    const r = await wetterHolen(['5630', '1630'], { tmax: 'tre200dx', regen_mm: 'rka150d0', symbol: 'jp2000d0' }, m)
    expect(r.fehlend).toEqual(['jp2000d0'])
    expect(r.lauf).toBe('vnut12.lssw.202611030800.tre200dx.csv')
    expect(r.zeilen).toEqual([
      { plz: '5630', datum: '2026-11-03', tmax: 11.4, regen_mm: 0 },
      { plz: '5630', datum: '2026-11-04', tmax: 8, regen_mm: 7.5 },
      { plz: '1630', datum: '2026-11-03', tmax: 9.2 },
    ])
    expect(m.geholt).not.toContain('https://x/vnut12.lssw.202611030700.tre200dx.csv')
  })

  it('fragt ohne Postleitzahlen nichts ab', async () => {
    const m = new Ersatz()
    expect((await wetterHolen([], { tmax: 'tre200dx' }, m)).zeilen).toEqual([])
    expect(m.geholt).toEqual([])
  })
})
