// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ergaenze, mailDringlichkeit } from './ki_dringlichkeit.ts'
import { abfragePfad, flach, katalogText } from './ki_fragen.ts'

const jetzt = new Date('2026-11-04T17:00:00Z')
const dec = (p: string) => decodeURIComponent(p)

describe('mailDringlichkeit', () => {
  it('Störung mit abgelaufener Frist ist hoch, Werbung tief, erledigt immer tief', () => {
    const stoerung = mailDringlichkeit(
      { art: 'stoerung', stand: 'neu', dringend: true, frist_am: '2026-11-04T15:00:00Z' },
      jetzt,
    )
    expect(stoerung.stufe).toBe('hoch')
    expect(stoerung.gruende).toContain('Antwortfrist vorbei')
    expect(mailDringlichkeit({ art: 'werbung', stand: 'neu' }, jetzt).stufe).toBe('tief')
    expect(mailDringlichkeit({ art: 'stoerung', stand: 'erledigt', dringend: true }, jetzt).stufe).toBe('tief')
  })

  it('Zurückgestellte und wartende Mails rutschen nach hinten', () => {
    const normal = mailDringlichkeit({ art: 'anfrage', stand: 'offen', frist_am: '2026-11-04T19:00:00Z' }, jetzt)
    const zurueck = mailDringlichkeit(
      { art: 'anfrage', stand: 'offen', frist_am: '2026-11-04T19:00:00Z', zurueck_am: '2026-11-06T07:00:00Z' },
      jetzt,
    )
    expect(normal.punkte).toBeGreaterThan(zurueck.punkte)
    expect(zurueck.gruende).toContain('zurückgestellt')
  })
})

describe('ergaenze', () => {
  it('sortiert den Posteingang nach Dringlichkeit, andere Tabellen bleiben unverändert', () => {
    const zeilen = [
      { id: 'a', art: 'werbung', stand: 'neu' },
      { id: 'b', art: 'kunde', stand: 'offen', nachfassen: true },
      { id: 'c', art: 'stoerung', stand: 'neu', dringend: true },
    ]
    const r = ergaenze('posteingang', zeilen, 'dringlichkeit', jetzt)
    expect(r.map((z) => z.id)).toEqual(['c', 'b', 'a'])
    expect(r[0]).toMatchObject({ dringlichkeit: 'hoch' })
    expect(ergaenze('posteingang', zeilen, null, jetzt).map((z) => z.id)).toEqual(['a', 'b', 'c'])
    expect(ergaenze('offerten', zeilen, 'dringlichkeit', jetzt)).toBe(zeilen)
  })
})

describe('Katalog für Posteingang und weitere Bereiche', () => {
  it('liest offene Mails der Person, vorsortiert nach Frist', () => {
    const r = abfragePfad({
      tabelle: 'posteingang',
      filter: [
        { feld: 'stand', op: 'in', wert: 'neu,offen' },
        { feld: 'person', op: 'gleich', wert: 'CR' },
      ],
      sortierung: { feld: 'dringlichkeit', absteigend: true },
      limit: 30,
    })
    const p = dec(r?.pfad ?? '')
    expect(p).toContain('posteingang?select=id,betreff')
    expect(p).toContain('person:personen!posteingang_zustaendig_id_fkey!inner(kuerzel,name)')
    expect(p).toContain('stand=in.("neu","offen")')
    expect(p).toContain('order=frist_am.asc.nullslast')
    expect(r?.verworfen).toEqual([])
  })

  it('filtert Lieferant und Projekt über die Verknüpfung und macht sie zu Text', () => {
    const p = dec(
      abfragePfad({
        tabelle: 'bestellungen',
        filter: [
          { feld: 'lieferant', op: 'enthaelt', wert: 'Solarmarkt' },
          { feld: 'projekt', op: 'enthaelt', wert: 'P-2026' },
        ],
        sortierung: null,
        limit: 10,
      })?.pfad ?? '',
    )
    expect(p).toContain('lieferant:lieferanten!bestellungen_lieferant_id_fkey!inner(name)')
    expect(p).toContain('lieferant.or=(name.ilike.*Solarmarkt*)')
    expect(p).toContain('projekt.or=(nummer.ilike.*P-2026*,titel.ilike.*P-2026*)')
    const z = flach([
      { id: 'b1', lieferant: { name: 'Solarmarkt' }, projekt: { nummer: 'P-2026-014', titel: 'Muster' } },
    ])
    expect(z[0]).toMatchObject({ lieferant: 'Solarmarkt', projekt: 'P-2026-014 Muster' })
  })

  it('liest Lager mit Artikel und filtert nach Artikelname', () => {
    const p = dec(
      abfragePfad({
        tabelle: 'lagerbestand',
        filter: [{ feld: 'artikel', op: 'enthaelt', wert: 'Modul' }],
        sortierung: null,
        limit: 20,
      })?.pfad ?? '',
    )
    expect(p).toContain('artikel:artikel!lagerbestand_artikel_id_fkey!inner(artikelnummer,name)')
    expect(p).toContain('artikel.or=(artikelnummer.ilike.*Modul*,name.ilike.*Modul*)')
    expect(flach([{ id: 'l1', artikel: { artikelnummer: 'M-450', name: 'Modul 450 W' } }])[0]).toMatchObject({
      artikel: 'M-450 Modul 450 W',
    })
  })

  it('Fristen ist eine Sicht ohne Papierkorb, und der Katalog nennt die Dringlichkeit', () => {
    const p = dec(abfragePfad({ tabelle: 'fristen', filter: [], sortierung: null, limit: 5 })?.pfad ?? '')
    expect(p).not.toContain('geloescht_am')
    expect(katalogText()).toContain('Nur zum Sortieren: dringlichkeit')
  })
})
