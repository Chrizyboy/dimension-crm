import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { Grossprojekt } from '../types'
import { Verkaufsblatt } from './Verkaufsblatt'

vi.mock('../services/grossprojekte', () => ({ ladeRegeln: vi.fn(() => Promise.resolve({})) }))

const basis = {
  id: 'g1',
  kanton: 'AG',
  gemeinde: 'Muri',
  parzelle: '1234',
  egrid: 'CH123456789',
  recherche: null,
  eignung: {
    weg: 'ppa',
    ampel: 'gruen',
    kwp_empfohlen: 233,
    kwp_dach: 324,
    eigenverbrauch_prozent: 70,
    verbrauch_kwh: 360_000,
    verbrauch_quelle: 'schaetzung',
    ersparnis_chf: 20_900,
    investition_chf: 280_000,
    marge_chf: 55_900,
    wartung_chf: 4_200,
    pruefungen: {
      kunde: [{ code: 'ersparnis', stand: 'ok', wert: 20_900 }],
      youdera: [{ code: 'eigentuemer', stand: 'offen', wert: 'offen' }],
      wir: [{ code: 'pv_bestand', stand: 'offen', wert: 12 }],
    },
  },
} as unknown as Grossprojekt

function zeige(g: Partial<Grossprojekt>) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Verkaufsblatt g={{ ...basis, ...g }} />
    </QueryClientProvider>,
  )
}

describe('Verkaufsblatt', () => {
  it('zeigt Ampel, Zahlen, die drei Seiten und das Warum aus den Zahlen', () => {
    zeige({})
    expect(screen.getByText('Passt')).toBeInTheDocument()
    expect(screen.getByText('233 kWp')).toBeInTheDocument()
    expect(screen.getByText("CHF 20'900")).toBeInTheDocument()
    expect(screen.getByText(/Spart rund CHF 20'900 pro Jahr/)).toBeInTheDocument()
    expect(screen.getByText(/Schon 12 kW PV: Erweiterung möglich/)).toBeInTheDocument()
    expect(screen.getByText(/Rund 233 kWp auf dem eigenen Dach/)).toBeInTheDocument()
    expect(screen.getByText(/kommen mit der Recherche/)).toBeInTheDocument()
    expect(screen.getByText(/EGRID: CH123456789/)).toBeInTheDocument()
  })

  it('zeigt das Verkaufsblatt der Recherche', () => {
    zeige({
      recherche: {
        verkauf: {
          warum: 'Käserei mit Kühlung, Dach frei',
          wer: 'Inhaber Hans Muster',
          kanal: 'telefon',
          einstieg: 'Grüezi Herr Muster',
          argumente: ['Keine Investition'],
          einwaende: [{ einwand: 'Dach ist alt', antwort: 'Wir prüfen es kostenlos' }],
        },
      },
    })
    expect(screen.getByText('Käserei mit Kühlung, Dach frei')).toBeInTheDocument()
    expect(screen.getByText('«Grüezi Herr Muster»')).toBeInTheDocument()
    expect(screen.getByText('«Dach ist alt»')).toBeInTheDocument()
    expect(screen.getByText('Telefon')).toBeInTheDocument()
  })

  it('ohne Prüfung ein Hinweis', () => {
    zeige({ eignung: {} })
    expect(screen.getByText(/Noch keine Prüfung/)).toBeInTheDocument()
  })
})
