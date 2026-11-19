import type { Grossprojekt } from '../types'
import { grundbuchFuer, hatEignung, offenePunkte } from './eignung'

describe('Youdera-Prüfung in der App', () => {
  it('findet die Grundbuch-Abfrage des Kantons, nur mit https', () => {
    const regeln = {
      grundbuch: {
        FR: { url: 'https://www.fr.ch/rf', de: 'RFpublic', fr: 'RFpublic' },
        XX: { url: 'javascript:alert(1)', de: '', fr: '' },
      },
    }
    expect(grundbuchFuer({ kanton: 'fr' }, regeln)?.de).toBe('RFpublic')
    expect(grundbuchFuer({ kanton: 'XX' }, regeln)).toBeNull()
    expect(grundbuchFuer({ kanton: 'AG' }, regeln)).toBeNull()
    expect(grundbuchFuer({ kanton: null }, regeln)).toBeNull()
  })

  it('sammelt die offenen Punkte aller Seiten', () => {
    const g = {
      eignung: {
        ampel: 'gelb',
        pruefungen: {
          kunde: [{ code: 'dach', stand: 'offen', wert: 1980 }],
          youdera: [
            { code: 'groesse', stand: 'ok', wert: 200 },
            { code: 'bonitaet', stand: 'offen' },
          ],
          wir: [{ code: 'pv_bestand', stand: 'ok', wert: 0 }],
        },
      },
    } as unknown as Grossprojekt
    expect(offenePunkte(g).map((p) => p.code)).toEqual(['dach', 'bonitaet'])
    expect(hatEignung(g)).toBe(true)
    expect(hatEignung({ eignung: {} })).toBe(false)
  })
})
