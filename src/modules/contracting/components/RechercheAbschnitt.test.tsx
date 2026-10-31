import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Grossprojekt } from '../types'
import { RechercheAbschnitt } from './RechercheAbschnitt'

const dienste = vi.hoisted(() => ({
  rechercheAnfordern: vi.fn(() => Promise.resolve()),
  rechercheUebernehmen: vi.fn(() => Promise.resolve()),
  schritteAlsAufgaben: vi.fn(() => Promise.resolve(2)),
}))
vi.mock('../services/grossprojekte', () => dienste)

const basis = {
  id: 'g1',
  bauherr: null,
  ansprechperson: null,
  recherche_am: '2026-10-31T09:00:00Z',
} as unknown as Grossprojekt

function zeige(g: Partial<Grossprojekt>) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RechercheAbschnitt g={{ ...basis, ...g }} />
    </QueryClientProvider>,
  )
}

describe('Recherche in der Akte', () => {
  it('wartet: sagt, dass die Recherche folgt, ohne Knopf', () => {
    zeige({ recherche_stand: 'wartet', recherche: null })
    expect(screen.getByText(/Die Recherche folgt/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('zeigt den Vorschlag und übernimmt erst per Klick', async () => {
    zeige({
      recherche_stand: 'fertig',
      recherche: {
        zusammenfassung: 'Produktionshalle der Muster AG',
        eigentuemer: {
          name: 'Muster AG',
          art: 'gewerbe',
          sicherheit: 'mittel',
          begruendung: 'Firmenwebsite',
          quelle: 'https://muster.ch',
        },
        ansprechpersonen: [
          { name: 'Anna Beispiel', funktion: 'Leiterin Technik', telefon: '+41560000000', quelle: null },
        ],
        naechste_schritte: [{ titel: 'Eigentum im Grundbuch bestätigen', text: '', in_tagen: 2 }],
        quellen: [{ titel: 'Team', url: 'https://muster.ch/team' }],
      },
    })
    expect(screen.getByText('Muster AG')).toBeInTheDocument()
    expect(screen.getByText('wahrscheinlich')).toBeInTheDocument()
    expect(screen.getByText('in 2 Tagen', { exact: false })).toBeInTheDocument()
    expect(dienste.rechercheUebernehmen).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    await waitFor(() => {
      expect(dienste.rechercheUebernehmen).toHaveBeenCalled()
    })
    expect(dienste.rechercheUebernehmen.mock.calls[0]).toMatchObject([
      'g1',
      { ansprechperson: { name: 'Anna Beispiel' } },
    ])
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Als Aufgaben anlegen' })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Als Aufgaben anlegen' }))
    await waitFor(() => {
      expect(dienste.schritteAlsAufgaben).toHaveBeenCalled()
    })
  })
})
