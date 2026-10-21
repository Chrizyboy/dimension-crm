import { act, render, screen } from '@testing-library/react'
import { findeModul } from '@/lib/navigation'
import { useUi } from '@/stores/ui'
import { ModulPlatzhalter } from './ModulPlatzhalter'

describe('ModulPlatzhalter', () => {
  const verkauf = findeModul('sales')
  if (!verkauf) throw new Error('Modul sales fehlt')

  it('zeigt Titel und geplante Phase auf Deutsch', () => {
    render(<ModulPlatzhalter modul={verkauf} />)
    expect(screen.getByRole('heading', { name: 'Verkauf' })).toBeInTheDocument()
    expect(screen.getByText(/Phase 6/, { selector: 'span' })).toBeInTheDocument()
  })

  it('wechselt den Titel auf Französisch', () => {
    act(() => {
      useUi.getState().setSprache('fr')
    })
    render(<ModulPlatzhalter modul={verkauf} />)
    expect(screen.getByRole('heading', { name: verkauf.titel.fr })).toBeInTheDocument()
    act(() => {
      useUi.getState().setSprache('de')
    })
  })
})
