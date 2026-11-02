import { describe, expect, it } from 'vitest'
import { sortiereZugehoerigkeiten, zugehoerigkeitAusZeile } from './zugehoerigkeiten'

const zeile = (id: string, name: string, haupt: boolean, reihenfolge = 0) =>
  zugehoerigkeitAusZeile({
    id,
    person_id: `p-${id}`,
    firma_id: 'f',
    funktion: null,
    hauptkontakt: haupt,
    unterschreibt: null,
    rechnungen: null,
    vor_ort: null,
    bevorzugt: null,
    reihenfolge,
    telefon: null,
    email: null,
    telefon_direkt: null,
    email_direkt: null,
    person_name: name,
    person_anrede: null,
    person_sprache: 'fr',
    firma_name: 'Beispiel SA',
    firma_art: 'firma',
    firma_kontaktart: 'lieferant',
  })

describe('Ansprechpersonen', () => {
  it('liest leere Felder als sichere Standardwerte', () => {
    const z = zeile('1', 'Mia Muster', false)
    expect(z.unterschreibt).toBe(false)
    expect(z.personSprache).toBe('fr')
    expect(z.firmaArt).toBe('firma')
  })

  it('zeigt den Hauptkontakt zuerst, dann Reihenfolge und Name', () => {
    const liste = sortiereZugehoerigkeiten([
      zeile('a', 'Zora', false, 1),
      zeile('b', 'Anna', false, 1),
      zeile('c', 'Max', true, 5),
      zeile('d', 'Ueli', false, 0),
    ])
    expect(liste.map((z) => z.personName)).toEqual(['Max', 'Ueli', 'Anna', 'Zora'])
  })
})
