import { describe, expect, it } from 'vitest'
import { dachZusammenfassen, gebaeudeSuchen, GeoAdmin, gwrFelder, heizungAusGwr, nutzungAusGwr } from './gebaeude.ts'

// Antworten im Aufbau von api3.geo.admin.ch, mit erfundenen Werten.

describe('Gebäuderegister', () => {
  it('übersetzt die Heizung', () => {
    expect(heizungAusGwr(7530)).toBe('oel')
    expect(heizungAusGwr(7520)).toBe('gas')
    expect(heizungAusGwr(7511)).toBe('waermepumpe')
    expect(heizungAusGwr(7501)).toBe('waermepumpe')
    expect(heizungAusGwr(7542)).toBe('holz')
    expect(heizungAusGwr(7581)).toBe('fernwaerme')
    expect(heizungAusGwr(7599)).toBe('unbekannt')
    expect(heizungAusGwr(null)).toBeUndefined()
  })

  it('erkennt die Nutzung aus Klasse und Kategorie', () => {
    expect(nutzungAusGwr(1263, 1060)).toBe('schule')
    expect(nutzungAusGwr(1251, 1060)).toBe('industrie')
    expect(nutzungAusGwr(null, 1020)).toBe('efh')
    expect(nutzungAusGwr(null, 1030, 12)).toBe('mfh')
    expect(nutzungAusGwr(null, 1030, 2)).toBeUndefined()
    expect(nutzungAusGwr(null, 1060)).toBeUndefined()
  })

  it('macht aus den Attributen Felder des CRM', () => {
    expect(
      gwrFelder({ egid: 190123456, gbauj: 1978, ganzwhg: 18, gkat: 1030, genh1: 7530, gwaerdath1: '2004-06-30' }),
    ).toEqual({ egid: '190123456', baujahr: 1978, wohnungen: 18, heizung: 'oel', heizung_jahr: 2004, nutzung: 'mfh' })
  })
})

describe('sonnendach.ch', () => {
  it('zählt nur geeignete Flächen, nimmt die beste Klasse', () => {
    expect(
      dachZusammenfassen([
        { flaeche: 820.4, klasse: 4, stromertrag: 140000 },
        { flaeche: 610, klasse: 3, stromertrag: 90000 },
        { flaeche: 300, klasse: 2, stromertrag: 30000 },
      ]),
    ).toEqual({ dachflaeche_m2: 1430, dach_klasse: 4, stromertrag_kwh: 230000 })
    expect(dachZusammenfassen([])).toEqual({})
  })
})

describe('Abfrage', () => {
  const antworten = (pfad: string, q: URLSearchParams): unknown => {
    if (pfad.endsWith('/SearchServer')) {
      return q.get('origins') === 'address' && q.get('searchText')?.includes('Industriestrasse')
        ? { results: [{ attrs: { x: 1236000.4, y: 2668000.6 } }] }
        : { results: [] }
    }
    if (pfad.endsWith('/identify') && q.get('layers')?.includes('solarenergie')) {
      return { results: [{ attributes: { building_id: 77, flaeche: 900, klasse: 4, stromertrag: 150000 } }] }
    }
    if (pfad.endsWith('/find')) {
      return {
        results: [
          { attributes: { building_id: 77, flaeche: 900, klasse: 4, stromertrag: 150000 } },
          { attributes: { building_id: 77, flaeche: 700, klasse: 5, stromertrag: 125000 } },
          { attributes: { building_id: 78, flaeche: 5000, klasse: 5, stromertrag: 1 } },
        ],
      }
    }
    if (pfad.endsWith('/identify'))
      return { results: [{ attributes: { egid: 5, gklas: 1251, genh1: 7520, gbauj: 1991 } }] }
    return {}
  }
  const geo = new GeoAdmin('https://ersatz')
  const echtesFetch = globalThis.fetch

  it('findet Lage, Dach und Gebäude und vertauscht x/y richtig', async () => {
    globalThis.fetch = (async (url: string) => {
      const u = new URL(url)
      return new Response(JSON.stringify(antworten(u.pathname, u.searchParams)), { status: 200 })
    }) as typeof fetch
    try {
      const r = await gebaeudeSuchen({ id: 'x', strasse: 'Industriestrasse 5', plz: '5630', gemeinde: 'Muri AG' }, geo)
      expect(r.daten).toMatchObject({
        lage_e: 2668001,
        lage_n: 1236000,
        dachflaeche_m2: 1600,
        dach_klasse: 5,
        stromertrag_kwh: 275000,
        egid: '5',
        heizung: 'gas',
        nutzung: 'industrie',
        baujahr: 1991,
      })
      expect(r.meldung).toBe('Dach 1600 m² geeignet, Gebäuderegister EGID 5')
      const keine = await gebaeudeSuchen({ id: 'y', strasse: 'Nirgendweg 1' }, geo)
      expect(keine.meldung).toBe('Adresse nicht gefunden')
    } finally {
      globalThis.fetch = echtesFetch
    }
  })
})
