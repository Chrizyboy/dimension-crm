import { describe, expect, it } from 'vitest'
import type { Geplant } from '../types'
import { filterGeplant } from './geplant'

const jetzt = new Date('2026-11-02T10:00:00')
const g = (teil: Partial<Geplant>): Geplant => ({
  lauf_id: Math.random().toString(),
  automation_id: 'a',
  name_de: 'Offerte nachfassen',
  name_fr: 'Relancer',
  titel: 'Muster Hans',
  tabelle: 'offerten',
  bezug_id: 'o',
  stand: 'wartet',
  weiter_am: '2026-11-02T14:00:00',
  schritt: 2,
  schritte: 6,
  art: 'mail',
  text_de: 'Haben Sie Fragen?',
  text_fr: 'Des questions ?',
  nach_aussen: true,
  modus: 'freigabe',
  grund: null,
  darf: true,
  ...teil,
})

describe('filterGeplant', () => {
  const liste = [
    g({}),
    g({
      weiter_am: '2026-11-05T09:00:00',
      art: 'aufgabe',
      nach_aussen: false,
      titel: 'Keller AG',
      text_de: 'Anrufen',
      text_fr: 'Appeler',
    }),
    g({ weiter_am: '2026-11-20T09:00:00' }),
    g({ stand: 'gestoppt', grund: 'Ferien' }),
  ]
  it('trennt heute, Woche, nach aussen und gestoppt', () => {
    expect(filterGeplant(liste, 'alle', '', jetzt)).toHaveLength(4)
    expect(filterGeplant(liste, 'heute', '', jetzt)).toHaveLength(1)
    expect(filterGeplant(liste, 'woche', '', jetzt)).toHaveLength(2)
    expect(filterGeplant(liste, 'aussen', '', jetzt)).toHaveLength(2)
    expect(filterGeplant(liste, 'gestoppt', '', jetzt)).toHaveLength(1)
  })
  it('sucht im Datensatz und im Text', () => {
    expect(filterGeplant(liste, 'alle', 'keller', jetzt)).toHaveLength(1)
    expect(filterGeplant(liste, 'alle', 'fragen', jetzt)).toHaveLength(3)
  })
})
