import { describe, expect, it } from 'vitest'
import { ablageNummer, korrigiereNachAblage, standNachAblage } from './ablage.mjs'

const ablage = { gewonnen: new Set(['101026', 'hyd-129', '101590']), verloren: new Set(['101590', '101000']) }

describe('Stand nach SharePoint-Ablage', () => {
  it('liest Nummern aus Ordnernamen wie in der Ablage', () => {
    expect(ablageNummer('100019 (12646)')).toBe('100019')
    expect(ablageNummer('HYD-129')).toBe('hyd-129')
    expect(ablageNummer('09103')).toBe('9103')
    expect(ablageNummer('Bureau')).toBeNull()
  })

  it('Ordner in Adjudications macht gewonnen, ohne Ordner geht «Auftrag» zurück auf offeriert', () => {
    expect(standNachAblage({ nr: 101026, statusKey: 'lost' }, ablage)?.status).toBe('closed')
    expect(standNachAblage({ nr: 'hyd-129', statusKey: 'construction' }, ablage)).toBeNull()
    expect(standNachAblage({ nr: 101058, statusKey: 'closed' }, ablage)?.status).toBe('sent')
    // Im Bau oder abgeschlossen bleibt gewonnen, auch ohne Ordner.
    expect(standNachAblage({ nr: 101594, statusKey: 'done' }, ablage)).toBeNull()
    // In beiden Ablagen: unklar, bleibt wie im alten CRM.
    expect(standNachAblage({ nr: 101590, statusKey: 'lost' }, ablage)).toBeNull()
  })

  it('merkt sich den alten Stand', () => {
    const projekte = { P1: { nr: 101026, statusKey: 'lost' }, P2: { nr: 101000, statusKey: 'lost' } }
    expect(korrigiereNachAblage(projekte, ablage)).toEqual([
      { nr: '101026', vorher: 'lost', nachher: 'closed', grund: 'Ordner in Adjudications' },
    ])
    expect(projekte.P1).toMatchObject({ statusKey: 'closed', _statusVorlage: 'lost' })
  })
})
