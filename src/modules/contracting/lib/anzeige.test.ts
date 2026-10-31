import { describe, expect, it } from 'vitest'
import { adresse, groesse, inAnsicht, investition, kartenLink, punkteStufe, zahl } from './anzeige'

describe('Anzeige Grossprojekte', () => {
  it('stuft Punkte ein, Ausgeschlossene immer «aus»', () => {
    expect(punkteStufe({ punkte: 82, ausschluss: null })).toBe('sehr_gut')
    expect(punkteStufe({ punkte: 55, ausschluss: null })).toBe('gut')
    expect(punkteStufe({ punkte: 49, ausschluss: null })).toBe('klein')
    expect(punkteStufe({ punkte: 90, ausschluss: 'efh' })).toBe('aus')
  })

  it('zeigt Grösse, Investition und Adresse', () => {
    const g = {
      schaetzung: { kwp: 1240, waerme_kw: 90, investition_rappen: 124_000_000, waerme_investition_rappen: 19_800_000 },
    }
    expect(zahl(12500)).toBe("12'500")
    expect(groesse(g, 'Wärme')).toBe("1'240 kWp · 90 kW Wärme")
    expect(groesse({ schaetzung: {} }, 'Wärme')).toBe('')
    expect(investition(g)).toBe(143_800_000)
    expect(adresse({ strasse: 'Industriestrasse 5', plz: '5630', gemeinde: 'Muri AG' })).toBe(
      'Industriestrasse 5, 5630 Muri AG',
    )
    expect(adresse({ strasse: null, plz: null, gemeinde: 'Bulle' })).toBe('Bulle')
  })

  it('filtert nach Reiter und baut den Kartenlink', () => {
    expect(inAnsicht({ stand: 'pruefen' }, 'pruefen')).toBe(true)
    expect(inAnsicht({ stand: 'verworfen' }, 'pruefen')).toBe(false)
    expect(inAnsicht({ stand: 'verworfen' }, 'alle')).toBe(true)
    expect(kartenLink({ lage_e: null, lage_n: null }, 'de')).toBeNull()
    expect(kartenLink({ lage_e: 2668000.4, lage_n: 1236000 }, 'fr')).toContain('E=2668000&N=1236000')
  })
})
