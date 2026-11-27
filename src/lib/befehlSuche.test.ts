import { describe, expect, it } from 'vitest'
import { befehlTreffer } from './befehlSuche'

const kennzahlen = [
  'Kennzahlen',
  'Wie läuft es, wo hakt es, was kommt: Verkauf, Abwicklung, Finanzen und Service mit Ziel und Vorjahr',
]

describe('befehlTreffer', () => {
  it('setzt den passenden Titel vor einen langen Untertitel mit denselben Buchstaben', () => {
    expect(befehlTreffer('Fehler melden', ['Fehler melden'])).toBeGreaterThan(
      befehlTreffer('Fehler melden', kennzahlen),
    )
  })
  it('findet Wortanfänge, Stichworte und ignoriert Akzente', () => {
    expect(befehlTreffer('kun', ['Kunden'])).toBeGreaterThan(0.9)
    expect(befehlTreffer('rechnung', ['Finanzen', 'Rechnungen und Zahlungen'])).toBeGreaterThan(0)
    expect(befehlTreffer('benoit', ['Benoît Buchhaltung'])).toBeGreaterThan(0.9)
  })
  it('lässt Tippfehler im Titel zu, aber hinter Wort-Treffern', () => {
    const tipp = befehlTreffer('kndn', ['Kunden'])
    expect(tipp).toBeGreaterThan(0)
    expect(tipp).toBeLessThan(befehlTreffer('kund', ['Kunden']))
  })
  it('setzt den Titel der anderen Sprache vor Teil-Treffer', () => {
    const offerten = befehlTreffer('offres', ['Offerten', 'Offerten', 'Offres', 'quotes'])
    const ausschreibungen = befehlTreffer('offres', [
      'Ausschreibungen',
      'Ausschreibungen',
      'Appels d’offres',
      'tenders',
    ])
    expect(offerten).toBeGreaterThan(ausschreibungen)
  })
  it('zeigt bei leerer Suche alles', () => {
    expect(befehlTreffer('', ['X'])).toBe(1)
  })
})
