import { describe, expect, it } from 'vitest'
import type { Abwesenheit, Einsatz, Person, Projekt } from '../types'
import {
  baustellenSicht,
  einsatzKonflikte,
  spurenVerteilen,
  tagImEinsatz,
  teamSicht,
  verschoben,
  zuPlanen,
  type PlanBalken,
} from './zeitplanAnsicht'

const einsatz = (id: string, von: string, bis: string, personen: string[] = [], art: Einsatz['art'] = 'intern') =>
  ({ id, projekt_id: 'p1', art, von, bis, personen, subunternehmer_id: null, notiz: null }) satisfies Einsatz
const projekt = (x: Partial<Projekt>) => ({ id: 'p1', kunde: 'Muster', status: 'im_bau', ...x }) as Projekt
const balken = (von: string, bis: string) => ({ von, bis, spur: 0 }) as PlanBalken

describe('Zeitplan-Ansicht', () => {
  it('legt überlappende Balken auf eigene Spuren', () => {
    const b = [
      balken('2026-11-02', '2026-11-04'),
      balken('2026-11-03', '2026-11-05'),
      balken('2026-11-05', '2026-11-06'),
    ]
    expect(spurenVerteilen(b)).toBe(2)
    expect(b.map((x) => x.spur)).toEqual([0, 1, 0])
  })

  it('erkennt abwesend und doppelt eingeplant, nicht aber «voraussichtlich»', () => {
    const a = einsatz('a', '2026-11-02', '2026-11-04', ['luca', 'marco'])
    const b = einsatz('b', '2026-11-04', '2026-11-04', ['marco'])
    const c = einsatz('c', '2026-11-03', '2026-11-03', ['marco'], 'geplant')
    const weg: Abwesenheit[] = [
      {
        id: 'x',
        person_id: 'luca',
        art: 'ferien',
        von: '2026-11-04',
        bis: '2026-11-06',
        halbtag: false,
        quelle: 'crm',
      },
    ]
    expect(einsatzKonflikte(a, [a, b, c], weg)).toEqual([
      { person: 'luca', grund: 'abwesend' },
      { person: 'marco', grund: 'doppelt' },
    ])
    expect(einsatzKonflikte(c, [a, b, c], [])).toEqual([])
  })

  it('zeigt nur Baustellen mit Einsatz, je Standort', () => {
    const g = baustellenSicht({
      projekte: [projekt({ standort_id: 's1' }), projekt({ id: 'p2', standort_id: 's1' })],
      einsaetze: [einsatz('a', '2026-11-02', '2026-11-03')],
      abwesend: [],
      personen: [],
      subunternehmer: [],
      standorte: [
        { id: 's1', name: 'Muri' },
        { id: 's2', name: 'Bulle' },
      ],
      passt: () => true,
    })
    expect(g.map((x) => [x.titel, x.zeilen.length])).toEqual([['Muri', 1]])
  })

  it('Team-Sicht: Monteure immer, andere nur mit Einsatz, Abwesenheit als Balken', () => {
    const personen: Person[] = [
      { id: 'm', kuerzel: 'MM', name: 'Milo', rolle: 'monteur' },
      { id: 'v', kuerzel: 'VV', name: 'Vera', rolle: 'verkauf' },
    ]
    const g = teamSicht({
      projekte: [projekt({})],
      einsaetze: [],
      abwesend: [
        { id: 'x', person_id: 'm', art: 'ferien', von: '2026-11-02', bis: '2026-11-03', halbtag: false, quelle: 'crm' },
      ],
      personen,
      subunternehmer: [],
      passt: () => true,
      abwesendText: () => 'Ferien',
    })
    expect(g[0]?.zeilen.map((z) => z.titel)).toEqual(['Milo'])
    expect(g[0]?.zeilen[0]?.balken[0]?.art).toBe('abwesend')
  })

  it('«Zu planen» sind Baustellen ohne Termin', () => {
    const liste = zuPlanen([
      projekt({ bau_status: 'ausstehend', baubeginn: null }),
      projekt({ id: 'p2', bau_status: 'terminiert', baubeginn: '2026-11-02' }),
    ])
    expect(liste.map((p) => p.id)).toEqual(['p1'])
  })

  it('verschiebt und verlängert, das Ende nie vor den Beginn', () => {
    const e = einsatz('a', '2026-11-02', '2026-11-04')
    expect(verschoben(e, 7)).toMatchObject({ von: '2026-11-09', bis: '2026-11-11' })
    expect(verschoben(e, 1, true)).toMatchObject({ von: '2026-11-02', bis: '2026-11-05' })
    expect(verschoben(e, -5, true)).toMatchObject({ bis: '2026-11-02' })
  })

  it('zählt Tag im Einsatz nur an Werktagen', () => {
    expect(tagImEinsatz({ von: '2026-11-05', bis: '2026-11-09' }, '2026-11-09')).toEqual({ nr: 3, von: 3 })
  })
})
