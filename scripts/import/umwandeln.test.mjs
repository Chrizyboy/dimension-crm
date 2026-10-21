import { describe, expect, it } from 'vitest'
import {
  adressSchluessel,
  ohne,
  trenneName,
  zuDatum,
  zuJaNein,
  zuOrtszeit,
  zuRappen,
  zuSprache,
  zuZahl,
} from './umwandeln.mjs'

describe('Umwandlung der Vorlagen-Werte', () => {
  it('liest Beträge als Zahl, Text und mit Hochkomma in Rappen', () => {
    expect(zuRappen(24713)).toBe(2471300)
    expect(zuRappen('24713.00')).toBe(2471300)
    expect(zuRappen("12'500.05")).toBe(1250005)
    expect(zuRappen('0.1')).toBe(10)
    expect(zuRappen('')).toBeNull()
    expect(zuRappen('abc')).toBeNull()
  })

  it('liest Zahlen aus Text', () => {
    expect(zuZahl('10.56')).toBe(10.56)
    expect(zuZahl('')).toBeNull()
  })

  it('nimmt aus Zeitstempeln nur das Datum', () => {
    expect(zuDatum('2026-10-02T11:50:56.167Z')).toBe('2026-10-02')
    expect(zuDatum('None')).toBeNull()
    expect(zuDatum('02.10.2026')).toBeNull()
  })

  it('rechnet Schweizer Ortszeit mit Sommer- und Winterzeit um', () => {
    expect(zuOrtszeit('2026-09-04', '09:00')).toBe('2026-09-04T07:00:00.000Z')
    expect(zuOrtszeit('2026-12-04', '9:00')).toBe('2026-12-04T08:00:00.000Z')
    expect(zuOrtszeit(null, '09:00')).toBeNull()
  })

  it('erkennt die Sprache', () => {
    expect(zuSprache('Deutsch')).toBe('de')
    expect(zuSprache('Französisch')).toBe('fr')
    expect(zuSprache('Français')).toBe('fr')
    expect(zuSprache('fr')).toBe('fr')
    expect(zuSprache('', 'fr')).toBe('fr')
  })

  it('liest Ja/Nein', () => {
    expect(zuJaNein('Ja')).toBe(true)
    expect(zuJaNein('Nein')).toBe(false)
    expect(zuJaNein('')).toBeNull()
  })

  it('trennt Namen: letzter Teil ist der Nachname', () => {
    expect(trenneName('Anna Muster')).toEqual({ vorname: 'Anna', nachname: 'Muster' })
    expect(trenneName('Jean Luc Exemple')).toEqual({ vorname: 'Jean Luc', nachname: 'Exemple' })
    expect(trenneName('Muster')).toEqual({ vorname: null, nachname: 'Muster' })
  })

  it('erkennt dieselbe Adresse trotz Schreibweise', () => {
    expect(adressSchluessel({ strasse: 'Hauptstr. 5', plz: '5630', ort: 'Muri' })).toBe(
      adressSchluessel({ strasse: 'hauptstrasse  5', plz: 5630, ort: 'MURI' }),
    )
  })

  it('entfernt Passwörter aus dem alten Datensatz', () => {
    expect(ohne({ name: 'A', pw: { hash: 'x' } }, ['pw'])).toEqual({ name: 'A' })
  })
})
