import { describe, expect, it } from 'vitest'
import type { Eingang, Offerte } from '../types'
import { arbeitstageZwischen, vorratKarten, vorratZahlen } from './vorrat'

const heute = '2026-11-02' // Montag

function offerte(x: Partial<Offerte>): Offerte {
  return {
    id: 'o1',
    nummer: '200031',
    titel: null,
    status: 'offeriert',
    stand: 'offeriert',
    sprache: 'de',
    standort: 'muri',
    standortId: null,
    angebotAm: '2026-10-14',
    angebotAmFrueher: [],
    faelligAm: '2026-11-09',
    betragRappen: 2_735_000,
    kwp: 11.2,
    anzahlModule: null,
    wechselrichter: null,
    batterie: null,
    entscheid: null,
    entscheidAm: null,
    vertagtGrund: null,
    verlustgrund: null,
    nachfassenAm: '2026-11-09',
    verantwortlichId: null,
    verantwortlichName: 'Andy',
    eturnityId: null,
    versionen: [],
    wirtschaftlichkeit: null,
    verkaufschanceId: null,
    kontaktId: 'k1',
    kundennummer: 1,
    name: 'Brunner',
    telefon: null,
    email: null,
    plz: '5630',
    ort: 'Muri AG',
    strasse: null,
    imEingang: false,
    projektId: null,
    werkvertragId: null,
    werkvertragStatus: null,
    geaendertAm: null,
    suchtext: '',
    gueltigBis: null,
    abgelaufen: false,
    varianten: [],
    variante: null,
    chance: 50,
    chanceProzent: null,
    entscheidErwartet: null,
    konkurrenz: null,
    rabattProzent: null,
    unterlagen: {},
    nachfassSchritt: 0,
    nachfassErgebnis: 'gesendet',
    freigabe: null,
    freigabeGrund: null,
    phase: 'offeriert',
    terminAm: null,
    zurOfferteAm: null,
    verkaufPersonName: null,
    eingangStatus: null,
    rueckfrage: null,
    ...x,
  }
}

function eingang(x: Partial<Eingang>): Eingang {
  return {
    id: 'l1',
    leadNummer: null,
    kontaktId: 'k2',
    name: 'Huber',
    plz: null,
    ort: 'Wohlen',
    strasse: null,
    standort: 'muri',
    sprache: 'de',
    terminAm: '2026-10-26T09:00:00Z',
    terminPersonId: null,
    terminPersonName: 'Loris',
    richtofferte: false,
    zurOfferteAm: '2026-10-26',
    status: 'neu',
    von: null,
    seit: null,
    hinweis: null,
    hinweisVon: null,
    rueckfrage: null,
    kommentarKunde: null,
    notizIntern: null,
    offerteId: null,
    offerteNummer: null,
    betragRappen: null,
    kwp: null,
    suchtext: '',
    ...x,
  }
}

describe('arbeitstageZwischen', () => {
  it('zählt nur Montag bis Freitag', () => {
    expect(arbeitstageZwischen('2026-10-26', '2026-11-02')).toBe(5)
    expect(arbeitstageZwischen('2026-10-30', '2026-11-02')).toBe(1)
    expect(arbeitstageZwischen('2026-11-02', '2026-11-02')).toBe(0)
  })
})

describe('vorratKarten', () => {
  it('Termin länger als das Ziel her: zu offerieren und überfällig', () => {
    const [k] = vorratKarten([], [eingang({ terminAm: '2026-10-23T09:00:00Z' })], { arbeitstage: 5 }, heute)
    expect(k?.phase).toBe('zu_offerieren')
    expect(k?.hinweis).toEqual({ art: 'ueberfaellig', tage: 6 })
  })

  it('Lead mit Offerte, die eine Freigabe braucht, steht in «prüfen»', () => {
    const o = offerte({ id: 'o2', imEingang: true, phase: 'pruefen', freigabeGrund: 'rabatt', status: 'in_arbeit' })
    const karten = vorratKarten([o], [eingang({ status: 'bearbeitung', offerteId: 'o2' })], { arbeitstage: 5 }, heute)
    expect(karten).toHaveLength(1)
    expect(karten[0]?.phase).toBe('pruefen')
    expect(karten[0]?.hinweis).toEqual({ art: 'freigabe', grund: 'rabatt' })
  })

  it('fällige Offerte zeigt «nachfassen», alte Gewonnene und Verlorene fallen weg', () => {
    const karten = vorratKarten(
      [
        offerte({ faelligAm: '2026-10-29' }),
        offerte({ id: 'o3', phase: 'gewonnen', entscheidAm: '2026-09-01', status: 'angenommen' }),
        offerte({ id: 'o4', phase: 'verloren', status: 'verloren' }),
        offerte({ id: 'o5', phase: 'gewonnen', entscheidAm: '2026-10-31', status: 'angenommen' }),
      ],
      [],
      { arbeitstage: 5 },
      heute,
    )
    expect(karten.map((k) => k.schluessel)).toEqual(['o:o1', 'o:o5'])
    expect(karten[0]?.hinweis).toEqual({ art: 'nachfassen', tage: 4 })
  })
})

describe('vorratZahlen', () => {
  it('rechnet offenes und gewichtetes Volumen und die Quote', () => {
    const liste = [
      offerte({ betragRappen: 2_000_000, chance: 50 }),
      offerte({ id: 'o2', phase: 'verhandlung', betragRappen: 1_000_000, chance: 80, kwp: 8 }),
      offerte({ id: 'o3', phase: 'gewonnen', entscheidAm: '2026-10-20' }),
      offerte({ id: 'o4', phase: 'verloren', entscheidAm: '2026-10-21' }),
    ]
    const z = vorratZahlen(liste, [], heute)
    expect(z.offenRappen).toBe(3_000_000)
    expect(z.offenAnzahl).toBe(2)
    expect(z.gewichtetRappen).toBe(1_800_000)
    expect(z.quote90).toBe(50)
  })
})
