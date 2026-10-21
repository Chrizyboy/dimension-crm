import type { Kontaktzeile } from '@/types/kontakt'
import type { Kundenakte, Offerte } from '../types'
import { naechsterSchritt } from './naechsterSchritt'

const kopf = (stand: string | null, standBezug: string | null = null) => ({ stand, standBezug }) as Kontaktzeile
const akte = (offerten: Partial<Offerte>[] = []) =>
  ({
    verkaufschancen: [],
    offerten,
    projekte: [],
    objekte: [],
    werkvertraege: [],
    dokumente: [],
  }) as unknown as Kundenakte

describe('naechsterSchritt', () => {
  it('schlägt bei einer neuen Anfrage den Anruf vor', () => {
    const s = naechsterSchritt(kopf('lead_neu'), akte())
    expect(s?.schluessel).toBe('erstkontakt')
    expect(s?.anrufen).toBe(true)
  })

  it('nennt beim Nachfassen die Offerte, ihr Datum und die Fälligkeit', () => {
    const o = { id: 'o1', nummer: '101444', angebot_am: '2024-07-08', nachfassen_am: '2026-10-20' }
    const s = naechsterSchritt(kopf('nachfassen', 'o1'), akte([o]))
    expect(s?.schluessel).toBe('nachfassen')
    expect(s?.werte).toEqual({ nummer: '101444', angebot: '08.07.2024', datum: '20.10.2026' })
  })

  it('zeigt bei verbauten Anlagen keinen Anruf, ohne Stand gar nichts', () => {
    expect(naechsterSchritt(kopf('dossier'), akte())?.anrufen).toBe(false)
    expect(naechsterSchritt(kopf(null), akte())).toBeNull()
  })
})
