import { describe, expect, it } from 'vitest'
import { anker, leseKapitel, linkZiel, neuigkeiten, nurText, stuecke, sucheImKapitel } from './kapitel'
import { alleNeuigkeiten, rollenAbschnitt } from './neuigkeiten'

const TEXT = `---
stand: 2026-11-02
rollen: verkauf, innendienst
---
# Offerten

Hier wird aus einem Lead eine Offerte.

## So geht's {#so}

### Eine Offerte senden

1. Reiter **Neue Offerten** öffnen.
2. **Per Mail senden** wählen,
   die Mail liegt dann im Ausgangskorb.

## Stände {#staende}

- **Neu**: noch niemand dran.

## Neu {#neu}

- 02.11.2026: Mail in der Sprache des Kunden.
- kein Datum
- 31.10.2026: Eturnity-PDF zieht kWp mit.
`

describe('Handbuch-Kapitel lesen', () => {
  const k = leseKapitel('quotes', TEXT)

  it('liest Kopf, Titel und Einleitung', () => {
    expect(k.stand).toBe('2026-11-02')
    expect(k.rollen).toEqual(['verkauf', 'innendienst'])
    expect(k.titel).toBe('Offerten')
    expect(k.einleitung).toEqual([{ art: 'absatz', text: 'Hier wird aus einem Lead eine Offerte.' }])
  })

  it('Abschnitte mit festem Schlüssel und Anleitungen mit Schritten', () => {
    expect(k.abschnitte.map((a) => a.schluessel)).toEqual(['so', 'staende', 'neu'])
    const so = k.abschnitte[0]
    expect(so?.unter[0]?.anker).toBe('so-eine-offerte-senden')
    expect(so?.unter[0]?.bloecke[0]).toEqual({
      art: 'liste',
      geordnet: true,
      punkte: ['Reiter **Neue Offerten** öffnen.', '**Per Mail senden** wählen, die Mail liegt dann im Ausgangskorb.'],
    })
  })

  it('Neuigkeiten nur mit gültigem Datum, neueste zuerst über alle Kapitel', () => {
    expect(neuigkeiten(k)).toEqual([
      { datum: '2026-11-02', text: 'Mail in der Sprache des Kunden.' },
      { datum: '2026-10-31', text: 'Eturnity-PDF zieht kWp mit.' },
    ])
    const anderes = leseKapitel('sales', '# Leads\n## Neu {#neu}\n- 01.11.2026: Lead aus Mail.')
    expect(alleNeuigkeiten([k, anderes]).map((n) => n.datum)).toEqual(['2026-11-02', '2026-11-01', '2026-10-31'])
    expect(alleNeuigkeiten([k, anderes], new Set(['sales']))).toHaveLength(1)
  })

  it('Suche findet die Anleitung, Titel zählt mehr', () => {
    const t = sucheImKapitel(k, 'mail senden')
    expect(t[0]?.anker).toBe('so-eine-offerte-senden')
    expect(sucheImKapitel(k, 'gibtsnicht')).toEqual([])
  })
})

describe('Text im Kapitel', () => {
  it('zerlegt Knöpfe und Links', () => {
    expect(stuecke('Klick **Speichern**, dann [Kunden](kapitel:customers).')).toEqual([
      { art: 'text', text: 'Klick ' },
      { art: 'fett', text: 'Speichern' },
      { art: 'text', text: ', dann ' },
      { art: 'link', text: 'Kunden', ziel: 'kapitel:customers' },
      { art: 'text', text: '.' },
    ])
    expect(nurText('**A** und [B](/sales)')).toBe('A und B')
  })

  it('Link-Ziele: Kapitel, Bereich der App, Web', () => {
    expect(linkZiel('kapitel:quotes#so')).toEqual({
      href: '#/knowledge?ansicht=kapitel&kapitel=quotes&stelle=so',
      extern: false,
    })
    expect(linkZiel('/sales')).toEqual({ href: '#/sales', extern: false })
    expect(linkZiel('https://www.dimension-solaire.ch')).toEqual({
      href: 'https://www.dimension-solaire.ch',
      extern: true,
    })
  })

  it('Anker ohne Akzente und Sonderzeichen', () => {
    expect(anker('Mise en service (MES) – étapes')).toBe('mise-en-service-mes-etapes')
  })

  it('Rolle der Person findet ihren Arbeitstag', () => {
    const da = ['verkauf', 'montage', 'administration']
    expect(rollenAbschnitt('monteur', da)).toBe('montage')
    expect(rollenAbschnitt('admin', da)).toBe('administration')
    expect(rollenAbschnitt('unbekannt', da)).toBe('verkauf')
  })
})
