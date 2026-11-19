import { describe, expect, it } from 'vitest'
import { rechercheLesen } from './gp_recherche.ts'
import { verkaufLesen } from './gp_verkauf.ts'

describe('Verkaufsblatt der Recherche', () => {
  it('nimmt Eigentum, Bonität und Verkaufsblatt, begrenzt Listen', () => {
    const v = verkaufLesen({
      eigentuemer_nutzt_selbst: true,
      bonitaet: 'auffaellig',
      bonitaet_hinweis: 'Nachlassstundung im SHAB',
      verkauf: {
        warum: 'Grosse Halle, viel Verbrauch',
        wer: 'Inhaber',
        kanal: 'fax',
        einstieg: 'Guten Tag',
        argumente: ['a', 'b', 'c', 'd', 'e', ''],
        einwaende: [{ einwand: 'Dach alt', antwort: 'Sanierung mitfinanziert' }, { einwand: 'ohne Antwort' }],
      },
    })
    expect(v.eigentuemer_nutzt_selbst).toBe(true)
    expect(v.bonitaet).toBe('auffaellig')
    expect(v.verkauf?.kanal).toBe('telefon')
    expect(v.verkauf?.argumente).toEqual(['a', 'b', 'c', 'd'])
    expect(v.verkauf?.einwaende).toEqual([{ einwand: 'Dach alt', antwort: 'Sanierung mitfinanziert' }])
  })

  it('Unbekanntes wird «unbekannt» oder null, ohne Warum kein Blatt', () => {
    const v = verkaufLesen({ eigentuemer_nutzt_selbst: 'ja', bonitaet: 'super', verkauf: { warum: '' } })
    expect(v).toEqual({ eigentuemer_nutzt_selbst: null, bonitaet: 'unbekannt', bonitaet_hinweis: null, verkauf: null })
    expect(rechercheLesen(null).verkauf).toBeNull()
  })
})
