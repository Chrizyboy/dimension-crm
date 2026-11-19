import { describe, expect, it } from 'vitest'
import type { Person, Rolle } from '../types'
import { umschalten, wirksameBereiche } from './sichtbareBereiche'

const person = (x: Partial<Person>) => ({ rechte: [], bereiche: [], ...x }) as unknown as Person
const rolle = (x: Partial<Rolle>) => ({ rechte: [], bereiche: [], ...x }) as unknown as Rolle
const ALLE = ['sales', 'quotes', 'projects']

describe('wirksameBereiche', () => {
  it('nimmt die eigene Auswahl vor der Rolle', () => {
    expect(wirksameBereiche(person({ bereiche: ['sales'] }), rolle({ bereiche: ['quotes'] }), ALLE)).toEqual({
      bereiche: ['sales'],
      quelle: 'person',
    })
  })
  it('nimmt sonst die Rolle, ohne Rolle alle', () => {
    expect(wirksameBereiche(person({}), rolle({ bereiche: ['quotes'] }), ALLE).quelle).toBe('rolle')
    expect(wirksameBereiche(person({}), rolle({}), ALLE).bereiche).toEqual(ALLE)
  })
  it('gibt mit «gl» immer alle', () => {
    expect(wirksameBereiche(person({ rechte: ['gl'], bereiche: ['sales'] }), undefined, ALLE)).toEqual({
      bereiche: ALLE,
      quelle: 'alle',
    })
  })
})

describe('umschalten', () => {
  it('fügt ohne Doppelte hinzu und nimmt weg', () => {
    expect(umschalten(['sales'], 'sales', true)).toEqual(['sales'])
    expect(umschalten(['sales', 'quotes'], 'sales', false)).toEqual(['quotes'])
  })
})
