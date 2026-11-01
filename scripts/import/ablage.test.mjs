import { describe, expect, it } from 'vitest'
import { ablageNummer, korrigiereNachAblage, standNachAblage } from './ablage.mjs'

const ablage = {
  gewonnen: new Set(['101026', 'hyd-129', '101590', '101700', '101701']),
  verloren: new Set(['101590', '101000']),
  ordner: new Map([
    ['101026', { gruppe: 'bulle-adjudications', jahr: '2024', name: '101026 - …', nummer: '101026' }],
    ['101700', { gruppe: 'bulle-adjudications', jahr: '2026', name: '101700 - …', nummer: '101700' }],
    ['101701', { gruppe: 'bulle-adjudications', jahr: '2026', unterordner: '2. FINI', name: '…', nummer: '101701' }],
  ]),
}

describe('Stand nach SharePoint-Ablage', () => {
  it('liest Nummern aus Ordnernamen wie in der Ablage', () => {
    expect(ablageNummer('100019 (12646)')).toBe('100019')
    expect(ablageNummer('HYD-129')).toBe('hyd-129')
    expect(ablageNummer('09103')).toBe('9103')
    expect(ablageNummer('Bureau')).toBeNull()
  })

  it('Ordner in Adjudications macht gewonnen, ohne Ordner geht «Auftrag» zurück auf offeriert', () => {
    expect(standNachAblage({ nr: 101700, statusKey: 'lost' }, ablage)?.status).toBe('closed')
    expect(standNachAblage({ nr: 'hyd-129', statusKey: 'construction' }, ablage)).toBeNull()
    expect(standNachAblage({ nr: 101058, statusKey: 'closed' }, ablage)?.status).toBe('sent')
    // Im Bau oder abgeschlossen bleibt gewonnen, auch ohne Ordner.
    expect(standNachAblage({ nr: 101594, statusKey: 'done' }, ablage)).toBeNull()
    // In beiden Ablagen: unklar, bleibt wie im alten CRM.
    expect(standNachAblage({ nr: 101590, statusKey: 'lost' }, ablage)).toBeNull()
  })

  it('Aufträge aus alten Jahren oder im Ordner «fertig» sind abgeschlossen, im Bau bleibt im Bau', () => {
    expect(standNachAblage({ nr: 101026, statusKey: 'lost' }, ablage)).toEqual({
      status: 'done',
      grund: 'Ordner in Adjudications, Ordner aus 2024, gilt als gebaut',
    })
    expect(standNachAblage({ nr: 101701, statusKey: 'closed' }, ablage)?.status).toBe('done')
    expect(standNachAblage({ nr: 101700, statusKey: 'closed' }, ablage)).toBeNull()
    expect(standNachAblage({ nr: 101026, statusKey: 'construction' }, ablage)).toBeNull()
    expect(standNachAblage({ nr: 101026, statusKey: 'closed' }, ablage, 2023)).toBeNull()
  })

  it('merkt sich den alten Stand', () => {
    const projekte = { P1: { nr: 101700, statusKey: 'lost' }, P2: { nr: 101000, statusKey: 'lost' } }
    expect(korrigiereNachAblage(projekte, ablage)).toEqual([
      { nr: '101700', vorher: 'lost', nachher: 'closed', grund: 'Ordner in Adjudications' },
      // Ohne Unterschrift und Angebotsdatum zählt der Auftrag im Jahr des Ordners.
      {
        nr: '101700',
        vorher: '',
        nachher: '2026-01-01',
        grund: 'Entscheid-Datum aus dem Jahr des Ordners (ohne Unterschriftsdatum)',
      },
    ])
    expect(projekte.P1).toMatchObject({ statusKey: 'closed', _statusVorlage: 'lost' })
  })
})
