import { afterEach, describe, expect, it, vi } from 'vitest'
import { gebaeudeInKachel, istKandidat, sucheFelder } from './dachsuche.ts'
import { GeoAdmin } from './gebaeude.ts'

// Antworten im Aufbau des Gebäuderegisters (api3.geo.admin.ch), mit erfundenen Werten.

const regeln = { klassen: [1251, 1263], min_grundflaeche_m2: 800, min_dach_m2: 500 }
const halle = { egid: 190555001, gklas: 1251, garea: 2400, gkode: 2668512.4, gkodn: 1236488.9 }

describe('Dachsuche', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('nimmt nur grosse Gebäude der gewählten Klassen mit Lage', () => {
    expect(istKandidat(halle, regeln)).toBe(true)
    expect(istKandidat({ ...halle, garea: 300 }, regeln)).toBe(false)
    expect(istKandidat({ ...halle, gklas: 1110 }, regeln)).toBe(false)
    expect(istKandidat({ ...halle, gkode: null }, regeln)).toBe(false)
  })

  it('macht aus Register und Dach die Felder für die Datenbank', () => {
    const f = sucheFelder(
      { ...halle, strname: ['Industriestrasse'], deinr: ['14'], dplz4: [5630], ggdename: 'Muri (AG)', genh1: 7530 },
      { dachflaeche_m2: 1600, dach_klasse: 5, stromertrag_kwh: 275000 },
    )
    expect(f).toMatchObject({
      egid: '190555001',
      strasse: 'Industriestrasse 14',
      plz: '5630',
      gemeinde: 'Muri (AG)',
      nutzung: 'industrie',
      heizung: 'oel',
      dachflaeche_m2: 1600,
      lage_e: 2668512,
      lage_n: 1236489,
    })
    expect(String(f.quell_url)).toContain('center=2668512,1236489')
  })

  it('holt eine Kachel seitenweise', async () => {
    const seiten: string[] = []
    const geo = new GeoAdmin('https://ersatz')
    vi.spyOn(geo, 'json').mockImplementation((_p, w) => {
      seiten.push(w.offset ?? '')
      const n = w.offset === '0' ? 200 : 3
      return Promise.resolve({ results: Array.from({ length: n }, (_, i) => ({ attributes: { egid: i } })) })
    })
    const alle = await gebaeudeInKachel({ kachel: 'k', e_min: 0, n_min: 0, e_max: 2000, n_max: 2000 }, geo)
    expect(alle).toHaveLength(203)
    expect(seiten).toEqual(['0', '200'])
  })
})
