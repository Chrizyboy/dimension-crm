// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { abfragePfad, flach, idsIn, sauber } from './ki_fragen.ts'

const dec = (p: string) => decodeURIComponent(p)

describe('abfragePfad', () => {
  it('baut Filter, Sortierung und Grenze aus dem Katalog', () => {
    const r = abfragePfad({
      tabelle: 'offerten',
      filter: [
        { feld: 'status', op: 'gleich', wert: 'offen' },
        { feld: 'betrag_rappen', op: 'gte', wert: '3000000' },
        { feld: 'angebot_am', op: 'lt', wert: '2026-10-19' },
      ],
      sortierung: { feld: 'angebot_am', absteigend: false },
      limit: 10,
    })
    const p = dec(r?.pfad ?? '')
    expect(p).toContain('offerten?select=id,nummer')
    expect(p).toContain('kunde:kontakte!offerten_kontakt_id_fkey(vorname,nachname,firma)')
    expect(p).toContain('geloescht_am=is.null')
    expect(p).toContain('status=eq.offen')
    expect(p).toContain('betrag_rappen=gte.3000000')
    expect(p).toContain('order=angebot_am.asc.nullslast')
    expect(p).toContain('limit=11')
    expect(r?.verworfen).toEqual([])
  })

  it('lässt unbekannte Felder, Tabellen und Vergleiche weg', () => {
    expect(abfragePfad({ tabelle: 'personen', filter: [], sortierung: null, limit: 5 })).toBeNull()
    const r = abfragePfad({
      tabelle: 'kontakte',
      filter: [
        { feld: 'alt_daten', op: 'gleich', wert: 'x' },
        { feld: 'nachname', op: 'drop', wert: 'x' },
      ],
      sortierung: { feld: 'passwort', absteigend: true },
      limit: 999,
    })
    expect(r?.verworfen).toEqual(['alt_daten gleich', 'nachname drop'])
    expect(dec(r?.pfad ?? '')).toContain('order=erstellt_am.desc')
    expect(r?.pfad).toContain('limit=51')
  })

  it('filtert Kunde, Ort und Person über die Einbettung (inner)', () => {
    const p = dec(
      abfragePfad({
        tabelle: 'verkaufschancen',
        filter: [
          { feld: 'kunde', op: 'enthaelt', wert: 'Brunner' },
          { feld: 'ort', op: 'enthaelt', wert: 'Wohlen' },
          { feld: 'person', op: 'gleich', wert: 'loris' },
          { feld: 'interesse', op: 'enthaelt', wert: 'speicher' },
        ],
        sortierung: null,
        limit: 20,
      })?.pfad ?? '',
    )
    expect(p).toContain('kunde:kontakte!verkaufschancen_kontakt_id_fkey!inner(')
    expect(p).toContain('objekt:objekte!verkaufschancen_objekt_id_fkey!inner(')
    expect(p).toContain('person:personen!verkaufschancen_tour_person_id_fkey!inner(')
    expect(p).toContain('kunde.or=(vorname.ilike.*Brunner*,nachname.ilike.*Brunner*,firma.ilike.*Brunner*)')
    expect(p).toContain('interesse=cs.{speicher}')
  })

  it('entschärft Steuerzeichen der Filtersprache', () => {
    expect(sauber('a,b)(c*"d')).toBe('a b  c  d')
    const p = dec(
      abfragePfad({
        tabelle: 'kontakte',
        filter: [{ feld: 'nachname', op: 'enthaelt', wert: 'x),or=(id.neq.0' }],
        sortierung: null,
        limit: 5,
      })?.pfad ?? '',
    )
    expect(p).not.toContain('or=(id')
  })
})

describe('flach und idsIn', () => {
  it('macht Kunde, Ort und Person zu Text und sammelt IDs', () => {
    const z = flach([
      {
        id: 'o1',
        kontakt_id: 'k1',
        kunde: { vorname: 'Lea', nachname: 'Beispiel', firma: null },
        objekt: { plz: '5610', ort: 'Wohlen' },
        person: { kuerzel: 'loris', name: 'Loris Test' },
      },
    ])
    expect(z[0]).toMatchObject({ kunde: 'Lea Beispiel', ort: '5610 Wohlen', person: 'Loris Test' })
    const ids = idsIn([{ tabelle: 'offerten', zeilen: z, mehr: false, verworfen: [], fehler: null }], null)
    expect(ids.get('o1')).toBe('offerten')
    expect(ids.get('k1')).toBe('kontakte')
  })
})
