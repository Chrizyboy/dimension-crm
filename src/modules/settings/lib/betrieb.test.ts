import { describe, expect, it } from 'vitest'
import type { BetriebStand } from '../types'
import { pruefpunkte } from './betrieb'

const jetzt = new Date('2026-11-02T10:00:00Z')
const bereit: BetriebStand = {
  schema: '20261107000200',
  tresor_url: true,
  tresor_schluessel: true,
  zeitplan_zuletzt: '2026-11-02T09:59:00Z',
  sicherung_zuletzt: '2026-11-01T15:00:00Z',
  personen_aktiv: 19,
  personen_ohne_rolle: 0,
  personen_angemeldet: 12,
  microsoft_verbunden: 4,
  kontakte: 686,
  offerten: 608,
  import_zuletzt: '2026-10-31T08:00:00Z',
}
const alle = { microsoft: true, abaninja: true, sms: true, zeitplan: true, ki: true, app_url: true }
const stand = (p: ReturnType<typeof pruefpunkte>, id: string) => p.find((x) => x.id === id)?.stand

describe('Betrieb: Prüfpunkte', () => {
  it('alles eingerichtet: alles grün', () => {
    const p = pruefpunkte({ stand: bereit, dienste: alle, microsoftAnmeldung: true, jetzt })
    expect(p.every((x) => x.stand === 'ok')).toBe(true)
  })
  it('Zeitplan läuft nicht oder Tresor fehlt: Fehler', () => {
    expect(
      stand(
        pruefpunkte({
          stand: { ...bereit, zeitplan_zuletzt: '2026-11-02T09:00:00Z' },
          dienste: alle,
          microsoftAnmeldung: true,
          jetzt,
        }),
        'zeitplan',
      ),
    ).toBe('fehlt')
    expect(
      stand(
        pruefpunkte({ stand: { ...bereit, tresor_url: false }, dienste: alle, microsoftAnmeldung: true, jetzt }),
        'zeitplan',
      ),
    ).toBe('fehlt')
  })
  it('Sicherung älter als 30 Stunden: Fehler', () => {
    const p = pruefpunkte({
      stand: { ...bereit, sicherung_zuletzt: '2026-10-31T10:00:00Z' },
      dienste: alle,
      microsoftAnmeldung: true,
      jetzt,
    })
    expect(stand(p, 'sicherung')).toBe('fehlt')
  })
  it('ohne Server-Funktionen: Funktionen fehlen, Dienste offen', () => {
    const p = pruefpunkte({ stand: bereit, dienste: null, microsoftAnmeldung: false, jetzt })
    expect(stand(p, 'funktionen')).toBe('fehlt')
    expect(stand(p, 'abaninja')).toBe('offen')
    expect(stand(p, 'anmeldung')).toBe('offen')
  })
  it('Personen ohne Rolle: offen, mit Anzahl', () => {
    const p = pruefpunkte({
      stand: { ...bereit, personen_ohne_rolle: 5 },
      dienste: alle,
      microsoftAnmeldung: true,
      jetzt,
    })
    expect(p.find((x) => x.id === 'personen')).toMatchObject({ stand: 'offen', werte: { ohne: 5 } })
  })
})
