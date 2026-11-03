import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InPapierkorbKnopf } from './InPapierkorbKnopf'

const dienste = vi.hoisted(() => ({
  legeInPapierkorb: vi.fn(() => Promise.resolve()),
  holeAusPapierkorb: vi.fn(() => Promise.resolve()),
}))
vi.mock('@/services/papierkorb', () => dienste)

describe('In den Papierkorb', () => {
  it('fragt nach und legt erst nach der Bestätigung weg', async () => {
    const fertig = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InPapierkorbKnopf tabelle="verkaufschancen" id="l1" name="L-2026-0412 Brunner" onFertig={fertig} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /In den Papierkorb/ }))
    expect(screen.getByText(/«L-2026-0412 Brunner» verschwindet aus allen Listen/)).toBeInTheDocument()
    expect(dienste.legeInPapierkorb).not.toHaveBeenCalled()
    const knoepfe = screen.getAllByRole('button', { name: /In den Papierkorb/ })
    fireEvent.click(knoepfe[knoepfe.length - 1] as HTMLElement)
    await waitFor(() => {
      expect(dienste.legeInPapierkorb).toHaveBeenCalledWith('verkaufschancen', 'l1')
    })
    await waitFor(() => {
      expect(fertig).toHaveBeenCalled()
    })
  })
})
