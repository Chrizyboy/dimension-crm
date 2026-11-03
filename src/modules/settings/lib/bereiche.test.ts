import { describe, expect, it } from 'vitest'
import type { EinstellungsBereich } from '@/types/einstellungen'
import { nachGruppen, sichtbareBereiche } from './bereiche'

const b = (
  id: string,
  gruppe: EinstellungsBereich['gruppe'],
  de: string,
  fr: string,
  recht = 'admin',
): EinstellungsBereich => ({
  id,
  gruppe,
  titel: { de, fr },
  beschreibung: { de: '', fr: '' },
  stichworte: { de: id === 'finanzen' ? 'Mahnfrist MWST' : '', fr: '' },
  icon: 'list',
  recht: recht as EinstellungsBereich['recht'],
  Inhalt: () => null,
})

const alle = [
  b('personen', 'firma', 'Personen', 'Personnes'),
  b('finanzen', 'ablaeufe', 'Finanzen', 'Finances', 'finanzen'),
  b('papierkorb', 'system', 'Papierkorb', 'Corbeille'),
]

describe('sichtbareBereiche', () => {
  it('blendet Bereiche ohne Recht aus', () => {
    expect(sichtbareBereiche(alle, (x) => x.recht === 'admin').map((x) => x.id)).toEqual(['personen', 'papierkorb'])
  })
  it('sucht in Titel und Stichworten beider Sprachen, ohne Akzente', () => {
    expect(sichtbareBereiche(alle, () => true, 'mahn').map((x) => x.id)).toEqual(['finanzen'])
    expect(sichtbareBereiche(alle, () => true, 'corbeille').map((x) => x.id)).toEqual(['papierkorb'])
  })
})

describe('nachGruppen', () => {
  it('ordnet nach fester Reihenfolge und lässt leere weg', () => {
    expect(nachGruppen(alle).map((g) => g.gruppe)).toEqual(['firma', 'ablaeufe', 'system'])
  })
})
