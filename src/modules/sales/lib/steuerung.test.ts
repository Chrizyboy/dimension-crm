import { describe, expect, it } from 'vitest'
import { VERKAUF_STANDARD } from './einstellung'
import { steuerung } from './steuerung'
import { testGeschaeft } from './testgeschaeft'

describe('steuerung', () => {
  const liste = [
    testGeschaeft({
      id: 'a',
      personId: 'lp',
      quelle: 'webseite',
      eingangAm: '2026-10-05',
      eingangZeit: '2026-10-05T08:00:00Z',
      erstkontaktAm: '2026-10-05T08:10:00Z',
      stand: 'angenommen',
      terminAm: '2026-10-08T09:00',
      offerteId: 'o1',
      wertRappen: 3_000_000,
    }),
    testGeschaeft({
      id: 'b',
      personId: 'lp',
      quelle: 'webseite',
      eingangAm: '2026-10-06',
      eingangZeit: '2026-10-06T08:00:00Z',
      erstkontaktAm: '2026-10-06T09:00:00Z',
      stand: 'kein',
      verlustgrund: 'Zu teuer',
    }),
    testGeschaeft({
      id: 'c',
      personId: 'fp',
      quelle: 'messe',
      eingangAm: '2026-10-07',
      stand: 'termin',
      terminAm: '2026-10-09T10:00',
    }),
    testGeschaeft({ id: 'alt', personId: 'fp', eingangAm: '2025-01-01', stand: 'lead_neu' }),
  ]

  it('zählt nur Leads im Zeitraum und rechnet Tempo und Quoten', () => {
    const s = steuerung(liste, '2026-10-01', '2026-10-31', VERKAUF_STANDARD)
    expect(s.gesamt).toMatchObject({
      leads: 3,
      termin: 2,
      offerte: 1,
      gewonnen: 1,
      verloren: 1,
      gewonnenRappen: 3_000_000,
    })
    expect(s.gesamt.erstkontaktMinuten).toBe(35)
    expect(s.gesamt.imTempo).toBe(0.5)
  })

  it('gruppiert nach Verkäufer und Quelle und sammelt Verlustgründe', () => {
    const s = steuerung(liste, '2026-10-01', '2026-10-31', VERKAUF_STANDARD)
    expect(s.proPerson.map((z) => [z.schluessel, z.leads])).toEqual([
      ['lp', 2],
      ['fp', 1],
    ])
    expect(s.proQuelle[0]).toMatchObject({ schluessel: 'webseite', gewonnen: 1 })
    expect(s.verlustgruende).toEqual([{ grund: 'Zu teuer', anzahl: 1 }])
  })
})
