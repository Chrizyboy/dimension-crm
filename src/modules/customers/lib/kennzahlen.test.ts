import type { Kundenakte, Nachverkauf } from '../types'
import { akteZahlen } from './kennzahlen'

const akte = (teil: Partial<Record<keyof Kundenakte, unknown>>) =>
  ({
    kontakt: { erstellt_am: '2026-10-31T10:00:00Z' },
    verkaufschancen: [],
    offerten: [],
    projekte: [],
    objekte: [],
    werkvertraege: [],
    dokumente: [],
    backupOrdner: [],
    ...teil,
  }) as unknown as Kundenakte
const nach = (teil: Partial<Record<keyof Nachverkauf, unknown>>) =>
  ({
    anlagen: [],
    serviceFaelle: [],
    wartungsvertraege: [],
    rechnungen: [],
    aufgaben: [],
    mails: [],
    ...teil,
  }) as unknown as Nachverkauf

describe('akteZahlen', () => {
  it('zählt Projekte und Werkverträge ohne Projekt, aber nichts doppelt', () => {
    const z = akteZahlen(
      akte({
        projekte: [{ id: 'p1', vertragswert_rappen: 3_986_000 }],
        werkvertraege: [
          { projekt_id: 'p1', unterschrieben_am: '2024-03-01', betrag_rappen: 3_986_000 },
          { projekt_id: null, unterschrieben_am: '2026-10-01', betrag_rappen: 500_000 },
          { projekt_id: null, unterschrieben_am: null, betrag_rappen: 900_000 },
        ],
      }),
      nach({}),
      '2026-11-02',
    )
    expect(z.auftraegeRappen).toBe(4_486_000)
  })

  it('rechnet offene Beträge nur aus gestellten Rechnungen und zählt überfällige', () => {
    const z = akteZahlen(
      akte({}),
      nach({
        rechnungen: [
          { status: 'gestellt', offen_rappen: 37_690, ueberfaellig: true },
          { status: 'teilbezahlt', offen_rappen: 10_000, ueberfaellig: false },
          { status: 'entwurf', offen_rappen: 99_999, ueberfaellig: false },
          { status: 'bezahlt', offen_rappen: 0, ueberfaellig: false },
        ],
      }),
      '2026-11-02',
    )
    expect(z.offenRappen).toBe(47_690)
    expect(z.ueberfaellig).toBe(1)
  })

  it('nimmt den nächsten Termin ab heute, Vergangenes und Erledigtes nicht', () => {
    const z = akteZahlen(
      akte({ verkaufschancen: [{ termin_am: '2026-11-06T13:00:00Z' }, { termin_am: '2026-10-01T09:00:00Z' }] }),
      nach({
        serviceFaelle: [{ status: 'erledigt', termin_am: '2026-11-03T08:00:00Z' }],
        wartungsvertraege: [{ status: 'aktiv', naechste_wartung: '2027-05-12' }],
        anlagen: [{ leistung_kwp: 12.4 }, { leistung_kwp: 0.35 }],
      }),
      '2026-11-02',
    )
    expect(z.naechsterTermin).toEqual({ datum: '2026-11-06T13:00:00Z', art: 'besichtigung' })
    expect(z.serviceOffen).toBe(0)
    expect(z.kwp).toBe(12.8)
    expect(z.kundeSeit).toBe('2026-10-31T10:00:00Z')
  })
})
