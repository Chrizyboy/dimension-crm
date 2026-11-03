import { describe, expect, it } from 'vitest'
import type { Grossprojekt } from '../types'
import { kwpVon, leistung, nachStufe, pipelineZahlen, ueberfaellig } from './pipeline'
import { eingaben, rechne, unserAnteil } from './rechner'

const gp = (x: Partial<Grossprojekt>): Grossprojekt =>
  ({
    id: x.id ?? 'a',
    stand: 'bewilligt',
    stufe: 'erstkontakt',
    schaetzung: { kwp: 100, investition_rappen: 120_000_00 },
    rechnung: {},
    vertrag_kwp: null,
    vertrag_am: null,
    naechster_schritt: 'Anrufen',
    naechster_schritt_am: null,
    ...x,
  }) as Grossprojekt

describe('Pipeline', () => {
  it('kWp: Vertrag vor Rechner vor Schätzung', () => {
    expect(kwpVon(gp({}))).toBe(100)
    expect(kwpVon(gp({ rechnung: { kwp: 80 } }))).toBe(80)
    expect(kwpVon(gp({ rechnung: { kwp: 80 }, vertrag_kwp: 90 }))).toBe(90)
  })

  it('überfällig nur offene mit Datum vor heute', () => {
    expect(ueberfaellig(gp({ naechster_schritt_am: '2026-11-01' }), '2026-11-02')).toBe(true)
    expect(ueberfaellig(gp({ naechster_schritt_am: '2026-11-02' }), '2026-11-02')).toBe(false)
    expect(ueberfaellig(gp({ naechster_schritt_am: '2026-11-01', stufe: 'vertrag' }), '2026-11-02')).toBe(false)
  })

  it('Kennzahlen gewichtet, Vertrag gegen Ziel, Verloren und Ungeprüfte zählen nicht', () => {
    const z = pipelineZahlen(
      [
        gp({ id: '1', stufe: 'erstkontakt', naechster_schritt_am: '2026-10-30' }),
        gp({ id: '2', stufe: 'angebot', naechster_schritt: null }),
        gp({ id: '3', stufe: 'vertrag', vertrag_kwp: 500, vertrag_am: '2026-11-20' }),
        gp({ id: '4', stufe: 'verloren' }),
        gp({ id: '5', stand: 'pruefen', stufe: null }),
      ],
      { ziel: { jahr: 2027, kwp: 2000 } },
      '2026-11-02',
    )
    expect(z.offen).toBe(2)
    expect(z.kwpOffen).toBe(200)
    expect(z.kwpGewichtet).toBeCloseTo(20 + 65)
    expect(z.kwpVertrag).toBe(500)
    expect(z.ueberfaellig).toBe(1)
    expect(z.ohneSchritt).toBe(1)
    expect(z.investitionGewichtet).toBeCloseTo(0.85 * 120_000_00)
  })

  it('Board nach Stufe, früheste Schritte oben', () => {
    const b = nachStufe([
      gp({ id: 'spaet', naechster_schritt_am: '2026-12-01' }),
      gp({ id: 'frueh', naechster_schritt_am: '2026-11-03' }),
      gp({ id: 'ohne' }),
    ])
    expect(b.erstkontakt.map((g) => g.id)).toEqual(['frueh', 'spaet', 'ohne'])
    expect(b.vertrag).toEqual([])
  })

  it('Leistung lesbar', () => {
    expect(leistung(3940)).toBe('3.9 MWp')
    expect(leistung(420.4)).toBe('420 kWp')
  })
})

describe('Rechner', () => {
  it('Ersparnis wie im Entwurf (Holzbau Waltenschwil)', () => {
    const e = {
      kwp: 420,
      kwh_pro_kwp: 1010,
      verbrauch_kwh: 585_000,
      eigenverbrauch_prozent: 62,
      strompreis_rp: 22.6,
      preis_rp: 16.4,
      chf_pro_kwp: 1200,
    }
    const r = rechne(e)
    expect(r.ertrag_kwh).toBe(424_200)
    expect(r.eigen_kwh).toBe(263_004)
    expect(Math.round(r.ersparnis_rappen / 100)).toBe(16_306)
    expect(r.investition_rappen).toBe(504_000_00)
  })

  it('Eigenverbrauch höchstens der Verbrauch', () => {
    const r = rechne({ ...eingaben(gp({}), undefined), verbrauch_kwh: 10_000, eigenverbrauch_prozent: 100 })
    expect(r.eigen_kwh).toBe(10_000)
  })

  it('Vorschläge aus Schätzung und Staffel, eigene Werte gehen vor', () => {
    const regeln = {
      annahmen: {
        chf_pro_kwp: [
          { bis: 100, chf: 1500 },
          { bis: null, chf: 1000 },
        ],
      },
    }
    expect(eingaben(gp({}), regeln).chf_pro_kwp).toBe(1500)
    expect(eingaben(gp({ rechnung: { kwp: 300 } }), regeln).chf_pro_kwp).toBe(1000)
    expect(eingaben(gp({ rechnung: { strompreis_rp: 25 } }), regeln).strompreis_rp).toBe(25)
  })

  it('Bauen und warten: Marge am Bau, Betrieb pro Jahr', () => {
    const u = unserAnteil(504_000_00, { annahmen: { marge_prozent: 20, betrieb_prozent: 1.5 } })
    expect(u.bau_rappen).toBe(100_800_00)
    expect(u.wartung_rappen_jahr).toBe(7_560_00)
    expect(unserAnteil(100_00, undefined).marge_prozent).toBe(20)
  })
})
