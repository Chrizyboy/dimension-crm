import { describe, expect, it, vi } from 'vitest'
import { BEISPIEL } from '../lib/vertragInhalt.test'
import { standAus } from './auftragsdaten'

vi.mock('@/services/supabase', () => ({ supabase: null }))

const OFFEN = { erledigt: false, datum: null }

describe('Stand des Auftrags', () => {
  it('Werkvertrag: mit Unterschrift des Kunden, Anzahlung aus dem Zahlungsplan', () => {
    const w = {
      ...BEISPIEL,
      versendetAm: '2026-11-02',
      zahlungsplan: BEISPIEL.zahlungsplan.map((t, i) => ({ ...t, bezahltAm: i === 0 ? '2026-11-12' : null })),
    }
    const s = standAus(w, { montage: { erledigt: true, datum: '2026-11-20' }, ibn: OFFEN, schluss: OFFEN })
    expect(s.map((x) => [x.schluessel, x.erledigt])).toEqual([
      ['offerte', true],
      ['versendet', true],
      ['unterschrieben', false],
      ['anzahlung', true],
      ['montage', true],
      ['ibn', false],
      ['schluss', false],
    ])
  })

  it('Auftragsbestätigung: ohne Schritt «unterschrieben»; letzte Rate bezahlt = Schlussrechnung', () => {
    const w = {
      ...BEISPIEL,
      angaben: { art: 'auftragsbestaetigung' as const },
      zahlungsplan: BEISPIEL.zahlungsplan.map((t) => ({ ...t, bezahltAm: '2026-12-20' })),
    }
    const s = standAus(w, { montage: OFFEN, ibn: OFFEN, schluss: OFFEN })
    expect(s.map((x) => x.schluessel)).not.toContain('unterschrieben')
    expect(s.at(-1)).toEqual({ schluessel: 'schluss', erledigt: true, datum: '2026-12-20' })
  })
})
