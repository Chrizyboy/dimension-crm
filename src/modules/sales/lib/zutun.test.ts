import { describe, expect, it } from 'vitest'
import { VERKAUF_STANDARD } from './einstellung'
import { testGeschaeft } from './testgeschaeft'
import { zuTun } from './zutun'

// Montag 2.11.2026, 10:00 Schweizer Zeit
const jetzt = new Date('2026-11-02T09:00:00Z')

describe('zuTun', () => {
  it('zeigt neue Anfragen ohne Anruf mit der Uhr, älteste zuerst', () => {
    const r = zuTun(
      [
        testGeschaeft({ id: 'a', eingangZeit: '2026-11-02T08:50:00Z', eingangAm: '2026-11-02' }),
        testGeschaeft({ id: 'b', eingangZeit: '2026-11-02T08:30:00Z', eingangAm: '2026-11-02' }),
        testGeschaeft({ id: 'c', eingangZeit: '2026-11-02T08:55:00Z', erstkontaktAm: '2026-11-02T08:56:00Z' }),
      ],
      jetzt,
      VERKAUF_STANDARD,
    )
    expect(r.jetzt.map((x) => x.g.id)).toEqual(['b', 'a'])
    expect(r.jetzt[0]).toMatchObject({ minuten: 30, ton: 'warnung' })
    expect(r.jetzt[1]).toMatchObject({ minuten: 10, ton: 'normal' })
    expect(r.zahlen.zuSpaet).toBe(1)
  })

  it('lässt übernommene Leads aus der Uhr', () => {
    const r = zuTun(
      [testGeschaeft({ eingangZeit: '2026-01-01T08:00:00Z', eingangAm: '2026-01-01', uebernommen: true })],
      jetzt,
      VERKAUF_STANDARD,
    )
    expect(r.jetzt).toHaveLength(0)
    expect(r.heute[0]?.art).toBe('liegt')
  })

  it('verteilt Rückrufe, Termine und Nachfassen auf heute und diese Woche', () => {
    const r = zuTun(
      [
        testGeschaeft({ id: 'r', stand: 'lead_offen', wiedervorlageAm: '2026-10-30' }),
        testGeschaeft({ id: 't', stand: 'termin', terminAm: '2026-11-04T14:00:00' }),
        testGeschaeft({ id: 'n', stand: 'nachfassen', nachfassenAm: '2026-11-02', wertRappen: 3_000_000 }),
        testGeschaeft({ id: 'w', stand: 'kein', wiedervorlageAm: '2026-11-01' }),
      ],
      jetzt,
      VERKAUF_STANDARD,
    )
    expect(r.heute.map((x) => [x.g.id, x.art, x.ton])).toEqual([
      ['r', 'rueckruf', 'warnung'],
      ['w', 'wiedervorlage', 'normal'],
      ['n', 'nachfassen', 'normal'],
    ])
    expect(r.woche.map((x) => x.art)).toEqual(['termin'])
    expect(r.zahlen).toMatchObject({ termineWoche: 1, offenRappen: 3_000_000 })
  })
})
