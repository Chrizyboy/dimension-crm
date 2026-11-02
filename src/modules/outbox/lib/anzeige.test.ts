import { describe, expect, it } from 'vitest'
import type { AusgangEintrag } from '../types'
import { fehlerLoesung, gruppiere, imOrdner, spaeterZeiten, vorschau, wartetStunden } from './anzeige'

function eintrag(w: Partial<AusgangEintrag>): AusgangEintrag {
  return {
    id: Math.random().toString(36).slice(2),
    kanal: 'mail',
    art: 'frei',
    an: 'kunde@example.ch',
    cc: null,
    betreff: 'Betreff',
    text: 'Text',
    html: null,
    status: 'wartet',
    automatisch: false,
    ki_status: null,
    ki_auftrag: null,
    fehler: null,
    verworfen_grund: null,
    anhaenge: [],
    erstellt_am: '2026-11-02T09:00:00Z',
    freigegeben_am: null,
    gesendet_am: null,
    sende_ab: null,
    rueckgaengig_bis: null,
    sprache: 'de',
    kontakt_id: null,
    verkaufschance_id: null,
    offerte_id: null,
    projekt_id: null,
    bezug_tabelle: null,
    bezug_id: null,
    absender_person_id: null,
    absender: null,
    freigegeben_durch: null,
    vorbereitet_von: null,
    zurueck_an: null,
    zurueck_von: null,
    zurueck_notiz: null,
    zurueck_am: null,
    verworfen_von: null,
    ruecklauf_am: null,
    kunde: null,
    darf_freigeben: true,
    fuer_mich: true,
    antwort_am: null,
    ...w,
  }
}

const jetzt = new Date('2026-11-02T14:00:00')

describe('Ausgangskorb-Anzeige', () => {
  it('Vorschau: Betreff bei Mail und Brief, Text bei SMS', () => {
    expect(vorschau({ kanal: 'mail', betreff: ' Offerte  O-1 ', text: 'x' })).toBe('Offerte O-1')
    expect(vorschau({ kanal: 'sms', betreff: null, text: 'Morgen\n07:30' })).toBe('Morgen 07:30')
    expect(vorschau({ kanal: 'brief', betreff: 'Werkvertrag', text: null })).toBe('Werkvertrag')
  })

  it('Ordner: geplant und unterwegs trennen sich an der Sendezeit', () => {
    const geplant = eintrag({ status: 'freigegeben', sende_ab: '2026-11-03T08:00:00' })
    const sofort = eintrag({ status: 'freigegeben' })
    expect(imOrdner(geplant, 'geplant', jetzt)).toBe(true)
    expect(imOrdner(geplant, 'unterwegs', jetzt)).toBe(false)
    expect(imOrdner(sofort, 'unterwegs', jetzt)).toBe(true)
    expect(imOrdner(eintrag({ fuer_mich: false }), 'fuer_mich', jetzt)).toBe(false)
    expect(imOrdner(eintrag({ fuer_mich: false }), 'team', jetzt)).toBe(true)
    expect(imOrdner(eintrag({ status: 'fehler' }), 'fehler', jetzt)).toBe(true)
  })

  it('Gruppen: drei gleiche wartende werden eine Serie, der Rest nach Alter', () => {
    const mahnungen = [1, 2, 3].map(() => eintrag({ art: 'mahnung', erstellt_am: '2026-11-02T06:00:00Z' }))
    const alt = eintrag({ erstellt_am: '2026-10-30T09:00:00Z' })
    const gestern = eintrag({ erstellt_am: '2026-11-01T12:00:00' })
    const g = gruppiere([...mahnungen, alt, gestern, eintrag({})], jetzt)
    expect(g.map((x) => x.schluessel)).toEqual(['serie:mahnung:2026-11-02', 'heute', 'gestern', 'aelter'])
    expect(g[0]?.serie).toBe(true)
    expect(g[0]?.eintraege).toHaveLength(3)
  })

  it('Gruppen: Newsletter derselben Kampagne bleiben zusammen, auch über Tage', () => {
    const nl = [1, 2, 3].map((i) =>
      eintrag({ art: 'newsletter', bezug_tabelle: 'kampagnen', bezug_id: 'k1', erstellt_am: `2026-10-2${i}T08:00:00Z` }),
    )
    expect(gruppiere(nl, jetzt)[0]?.schluessel).toBe('serie:newsletter:k1')
  })

  it('Später senden: Montag nicht doppelt, am Nachmittag kein «heute 17:00»', () => {
    // Freitag 15:00 → heute 17:00, Montag 08:00 (morgen wäre Samstag)
    const fr = spaeterZeiten(new Date('2026-11-06T15:00:00'))
    expect(fr.map((z) => z.schluessel)).toEqual(['heute17', 'montag8'])
    expect(fr[1]?.zeit.getDate()).toBe(9)
    // Sonntag 18:00 → morgen = Montag 08:00, kein zweiter Montag
    const so = spaeterZeiten(new Date('2026-11-08T18:00:00'))
    expect(so.map((z) => z.schluessel)).toEqual(['morgen8'])
    // Dienstag 10:00 → alle drei
    expect(spaeterZeiten(new Date('2026-11-03T10:00:00')).map((z) => z.schluessel)).toEqual([
      'heute17',
      'morgen8',
      'montag8',
    ])
  })

  it('Wartezeit zählt ab «zurück an», sonst ab Erstellung', () => {
    expect(wartetStunden({ erstellt_am: '2026-11-01T12:00:00', zurueck_am: null }, jetzt)).toBe(26)
    expect(wartetStunden({ erstellt_am: '2026-11-01T12:00:00', zurueck_am: '2026-11-02T13:00:00' }, jetzt)).toBe(1)
  })

  it('Fehler bekommen eine passende Lösung', () => {
    expect(fehlerLoesung({ kanal: 'mail', fehler: 'ausgang.unklar' })).toBe('unklar')
    expect(fehlerLoesung({ kanal: 'mail', fehler: 'nicht_verbunden' })).toBe('outlook')
    expect(fehlerLoesung({ kanal: 'sms', fehler: 'nicht_eingerichtet' })).toBe('sms')
    expect(fehlerLoesung({ kanal: 'mail', fehler: 'anhang_zu_gross' })).toBe('anhang')
    expect(fehlerLoesung({ kanal: 'mail', fehler: 'intern' })).toBe('nochmal')
  })
})
